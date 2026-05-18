import hashlib
import secrets
import jwt
from datetime import datetime, timedelta, timezone
from typing import Any, Union
from uuid import UUID
from app.core.config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 dias de expiração para conveniência no CRM

def hash_password(password: str) -> str:
    """Gera um hash PBKDF2-HMAC-SHA256 seguro a partir de uma senha em texto plano."""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{pwd_hash.hex()}"

def verify_password(password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash armazenado no banco."""
    if not hashed_password:
        return False
    try:
        salt, stored_hash = hashed_password.split(':')
        pwd_hash = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return pwd_hash.hex() == stored_hash
    except Exception:
        return False

def create_access_token(subject: Union[str, UUID, Any], expires_delta: timedelta = None) -> str:
    """Gera um token JWT assinado criptograficamente contendo a identidade do usuário."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Union[str, None]:
    """Valida e decodifica um token JWT, retornando o ID do usuário (sub) ou None se for inválido/expirado."""
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return decoded_token["sub"]
    except jwt.PyJWTError:
        return None
