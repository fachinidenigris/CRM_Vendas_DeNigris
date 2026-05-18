from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.api.routes import router as api_router
from app.core.config import settings
from app.db.database import engine, Base
from app.services.email_reader import email_listener_loop

# Create tables for MVP (in production, we should use Alembic)
Base.metadata.create_all(bind=engine)

from app.db import models
from app.db.database import SessionLocal
from app.core import security
from sqlalchemy import text, inspect

def run_migrations():
    # Se for PostgreSQL, precisamos atualizar o tipo ENUM físico no banco de dados!
    if "postgresql" in str(engine.url):
        try:
            print("[MIGRATION] Banco PostgreSQL detectado. Verificando/Atualizando enum 'leadstatusenum'...")
            # ALTER TYPE no PostgreSQL exige autocommit (fora de bloco transacional)
            raw_conn = engine.raw_connection()
            raw_conn.autocommit = True
            cursor = raw_conn.cursor()
            
            # Consultar os valores existentes fisicamente no enum
            cursor.execute("""
                SELECT enumlabel 
                FROM pg_enum 
                JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
                WHERE pg_type.typname = 'leadstatusenum';
            """)
            existing_statuses = {row[0] for row in cursor.fetchall()}
            print(f"[MIGRATION] Statuses existentes no enum do PostgreSQL: {existing_statuses}")
            
            new_statuses = ["novo", "qualificacao", "distribuido", "venda_realizada", "venda_perdida"]
            for status in new_statuses:
                if status not in existing_statuses:
                    print(f"[MIGRATION] Status '{status}' está ausente. Adicionando ao enum 'leadstatusenum'...")
                    cursor.execute(f"ALTER TYPE leadstatusenum ADD VALUE '{status}'")
                    print(f"[MIGRATION] Status '{status}' adicionado com sucesso!")
                    
            cursor.close()
            raw_conn.close()
        except Exception as err:
            print(f"[MIGRATION] Erro ao atualizar enums do PostgreSQL: {err}")

    db = SessionLocal()
    try:
        inspector = inspect(engine)
        columns = [c["name"] for c in inspector.get_columns("users")]
        
        if "password_hash" not in columns:
            print("[MIGRATION] Coluna 'password_hash' não encontrada na tabela 'users'. Adicionando...")
            db.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
            db.commit()
            print("[MIGRATION] Coluna 'password_hash' adicionada com sucesso.")
            
        if "is_paused" not in columns:
            print("[MIGRATION] Coluna 'is_paused' não encontrada na tabela 'users'. Adicionando...")
            db.execute(text("ALTER TABLE users ADD COLUMN is_paused BOOLEAN DEFAULT FALSE"))
            db.commit()
            db.execute(text("UPDATE users SET is_paused = FALSE WHERE is_paused IS NULL"))
            db.commit()
            print("[MIGRATION] Coluna 'is_paused' adicionada com sucesso.")
            
        # Leads migrations
        lead_columns = [c["name"] for c in inspector.get_columns("leads")]
        
        new_columns = [
            ("loss_observation", "VARCHAR"),
            ("reactivation_date", "TIMESTAMP"),
            ("sale_date", "TIMESTAMP"),
            ("sale_value", "FLOAT"),
            ("sale_product", "VARCHAR"),
            ("sale_model", "VARCHAR"),
            ("is_archived", "BOOLEAN DEFAULT FALSE")
        ]
        
        for col_name, col_type in new_columns:
            if col_name not in lead_columns:
                print(f"[MIGRATION] Coluna '{col_name}' não encontrada na tabela 'leads'. Adicionando...")
                db.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_type}"))
                db.commit()
                
        # Status Migration (Legado -> Novo Fluxo)
        print("[MIGRATION] Sincronizando status antigos de leads para o novo fluxo...")
        db.execute(text("UPDATE leads SET status = 'novo' WHERE status IN ('leads_novos', 'leads_pendentes')"))
        db.execute(text("UPDATE leads SET status = 'qualificacao' WHERE status IN ('primeiro_contato_realizado', 'lead_qualificado')"))
        db.execute(text("UPDATE leads SET status = 'distribuido' WHERE status IN ('enviado_para_vendedor', 'em_negociacao')"))
        db.execute(text("UPDATE leads SET status = 'venda_realizada' WHERE status = 'venda_ganha'"))
        db.commit()
        
        # Garantir integridade de arquivamento
        db.execute(text("UPDATE leads SET is_archived = FALSE WHERE is_archived IS NULL"))
        db.commit()

    except Exception as e:
        print(f"[MIGRATION] Erro ao executar migrações automáticas: {e}")
        db.rollback()
    finally:
        db.close()

run_migrations()

def seed_db():
    db = SessionLocal()
    try:
        # Buscar se existe um usuário com o e-mail do Fabio
        fabio = db.query(models.User).filter(models.User.email == "fachini.denigris@gmail.com").first()
        if not fabio:
            print("[SEED] Fabio Fachini não encontrado. Criando administrador...")
            admin = models.User(
                name="Fabio Fachini",
                email="fachini.denigris@gmail.com",
                role=models.RoleEnum.admin,
                is_paused=False,
                password_hash=security.hash_password("denigris123")
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            fabio = admin
            
            # Criar equipe padrão se não houver nenhuma
            equipe = db.query(models.Team).first()
            if not equipe:
                equipe = models.Team(
                    name="Equipe De Nigris",
                    manager_id=admin.id
                )
                db.add(equipe)
                db.commit()
                db.refresh(equipe)
            
            # Associar admin à equipe
            admin.team_id = equipe.id
            db.add(admin)
            db.commit()
            print(f"[SEED] Fabio Fachini e equipe padrão criados com sucesso.")
        else:
            # Se o usuário já existir mas não tiver hash de senha, ou se quisermos garantir que seja denigris123
            if not fabio.password_hash:
                print("[SEED] Fabio Fachini já existe, mas sem hash de senha. Atualizando para 'denigris123'...")
                fabio.password_hash = security.hash_password("denigris123")
                db.add(fabio)
                db.commit()
                print("[SEED] Senha do Fabio Fachini restaurada.")
    except Exception as e:
        print(f"[SEED] Erro ao semear banco de dados: {e}")
        db.rollback()
    finally:
        db.close()

seed_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicia a task de leitura de e-mails em background
    task = asyncio.create_task(email_listener_loop())
    yield
    # Limpeza caso a aplicação desligue
    task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "CRM Leads API is running"}
