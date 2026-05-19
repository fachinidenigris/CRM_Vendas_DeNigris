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
    """
    Migração automática de banco de dados — dividida em 3 blocos independentes.
    REGRA CRÍTICA: Qualquer exceção em qualquer bloco é capturada e logada, 
    mas NUNCA derruba o processo do servidor (o CORS depende disso).
    """
    # =========================================================================
    # BLOCO 1: Migração ENUM -> VARCHAR no PostgreSQL (Render)
    # Usa raw_connection com autocommit — completamente fora do ORM/SQLAlchemy
    # para evitar validação de tipo em nível de driver.
    # =========================================================================
    if "postgresql" in str(engine.url):
        raw_conn = None
        try:
            print("[MIGRATION-PG] Iniciando migração de ENUM -> VARCHAR no PostgreSQL...")
            raw_conn = engine.raw_connection()
            raw_conn.autocommit = True
            cursor = raw_conn.cursor()

            def migrate_col_to_varchar(table: str, column: str):
                """Converte coluna ENUM para VARCHAR se necessário. Operação idempotente."""
                cursor.execute(
                    "SELECT data_type FROM information_schema.columns WHERE table_name=%s AND column_name=%s;",
                    (table, column)
                )
                row = cursor.fetchone()
                if not row:
                    print(f"[MIGRATION-PG] {table}.{column} não encontrada. Pulando.")
                    return
                data_type = row[0]
                print(f"[MIGRATION-PG] {table}.{column}: tipo='{data_type}'")
                if data_type == "USER-DEFINED":
                    print(f"[MIGRATION-PG] Convertendo {table}.{column} ENUM -> VARCHAR...")
                    cursor.execute(
                        f"ALTER TABLE {table} ALTER COLUMN {column} TYPE VARCHAR USING {column}::text"
                    )
                    print(f"[MIGRATION-PG] ✅ {table}.{column} convertida para VARCHAR!")

            migrate_col_to_varchar("leads", "status")
            migrate_col_to_varchar("leads", "priority")
            migrate_col_to_varchar("tasks", "task_type")

            cursor.close()
            print("[MIGRATION-PG] ✅ Bloco 1 concluído.")
        except Exception as err:
            print(f"[MIGRATION-PG] ⚠️ Erro no Bloco 1 (ENUM->VARCHAR): {err}")
        finally:
            if raw_conn:
                try:
                    raw_conn.close()
                except Exception:
                    pass

    # =========================================================================
    # BLOCO 2: Migrações de Schema (ADD COLUMN) via SessionLocal
    # =========================================================================
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        user_columns = [c["name"] for c in inspector.get_columns("users")]

        if "password_hash" not in user_columns:
            print("[MIGRATION] Adicionando coluna 'password_hash' em 'users'...")
            db.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
            db.commit()

        if "is_paused" not in user_columns:
            print("[MIGRATION] Adicionando coluna 'is_paused' em 'users'...")
            db.execute(text("ALTER TABLE users ADD COLUMN is_paused BOOLEAN DEFAULT FALSE"))
            db.commit()
            db.execute(text("UPDATE users SET is_paused = FALSE WHERE is_paused IS NULL"))
            db.commit()

        lead_columns = [c["name"] for c in inspector.get_columns("leads")]
        new_lead_columns = [
            ("loss_observation", "VARCHAR"),
            ("reactivation_date", "TIMESTAMP"),
            ("sale_date", "TIMESTAMP"),
            ("sale_value", "FLOAT"),
            ("sale_product", "VARCHAR"),
            ("sale_model", "VARCHAR"),
            ("is_archived", "BOOLEAN DEFAULT FALSE"),
        ]
        for col_name, col_type in new_lead_columns:
            if col_name not in lead_columns:
                print(f"[MIGRATION] Adicionando coluna '{col_name}' em 'leads'...")
                db.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_type}"))
                db.commit()

        db.execute(text("UPDATE leads SET is_archived = FALSE WHERE is_archived IS NULL"))
        db.commit()
        print("[MIGRATION] ✅ Bloco 2 concluído.")

    except Exception as e:
        print(f"[MIGRATION] ⚠️ Erro no Bloco 2 (schema): {e}")
        db.rollback()
    finally:
        db.close()

    # =========================================================================
    # BLOCO 3: Migração de STATUS legados -> novo fluxo (somente se VARCHAR)
    # Usa raw_connection com autocommit para evitar validação de ENUM pelo ORM.
    # =========================================================================
    raw_conn3 = None
    try:
        raw_conn3 = engine.raw_connection()
        raw_conn3.autocommit = True
        cursor3 = raw_conn3.cursor()

        # Verificar tipo atual da coluna — só roda UPDATE se for VARCHAR
        cursor3.execute(
            "SELECT data_type FROM information_schema.columns WHERE table_name='leads' AND column_name='status';"
        )
        row = cursor3.fetchone()
        col_type = row[0] if row else "unknown"

        if col_type != "USER-DEFINED":
            print(f"[MIGRATION] leads.status é '{col_type}'. Sincronizando status legados...")
            cursor3.execute("UPDATE leads SET status = 'novo' WHERE status IN ('leads_novos', 'leads_pendentes')")
            cursor3.execute("UPDATE leads SET status = 'qualificacao' WHERE status IN ('primeiro_contato_realizado', 'lead_qualificado')")
            cursor3.execute("UPDATE leads SET status = 'distribuido' WHERE status IN ('enviado_para_vendedor', 'em_negociacao')")
            cursor3.execute("UPDATE leads SET status = 'venda_realizada' WHERE status = 'venda_ganha'")
            print("[MIGRATION] ✅ Bloco 3 — status legados sincronizados.")
        else:
            print("[MIGRATION] ⚠️ leads.status ainda é ENUM. UPDATE de status legados pulado por segurança.")

        cursor3.close()
    except Exception as e:
        print(f"[MIGRATION] ⚠️ Erro no Bloco 3 (status legados): {e}")
    finally:
        if raw_conn3:
            try:
                raw_conn3.close()
            except Exception:
                pass


run_migrations()


def seed_db():
    db = SessionLocal()
    try:
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

            equipe = db.query(models.Team).first()
            if not equipe:
                equipe = models.Team(
                    name="Equipe De Nigris",
                    manager_id=admin.id
                )
                db.add(equipe)
                db.commit()
                db.refresh(equipe)

            admin.team_id = equipe.id
            db.add(admin)
            db.commit()
            print("[SEED] Fabio Fachini e equipe padrão criados com sucesso.")
        else:
            if not fabio.password_hash:
                print("[SEED] Atualizando senha do Fabio Fachini...")
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

# CORS — permite todas as origens (ajustar para o domínio exato em produção)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "CRM Leads API is running"}
