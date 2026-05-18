from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "CRM Leads API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # SQLite / Banco de Dados Local para MVP
    DATABASE_URL: str = "sqlite:///./crm_leads.db"
    
    # Gemini AI
    GEMINI_API_KEY: Optional[str] = None
    
    # Gmail IMAP
    EMAIL_USER: Optional[str] = None
    EMAIL_APP_PASSWORD: Optional[str] = None
    
    # Security (JWT handled by Supabase, but we can have local secrets if needed)
    SECRET_KEY: str = "super-secret-key-for-local-dev-only"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
