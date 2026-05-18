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

def seed_db():
    db = SessionLocal()
    try:
        user_count = db.query(models.User).count()
        if user_count == 0:
            print("[SEED] Nenhum usuário encontrado. Criando administrador padrão...")
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
            
            # Criar equipe padrão
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
            print(f"[SEED] Administrador padrão '{admin.name}' e equipe '{equipe.name}' criados com sucesso.")
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
