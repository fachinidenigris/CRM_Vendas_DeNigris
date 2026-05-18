import imaplib
import email
import asyncio
from email.header import decode_header
import logging
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db import models
from app.services.ai_parser import parse_email_content
from app.core.config import settings

logger = logging.getLogger(__name__)

def connect_imap():
    try:
        # Conecta no IMAP do Gmail com timeout de 15 segundos para evitar travamentos indefinidos
        mail = imaplib.IMAP4_SSL("imap.gmail.com", timeout=15)
        mail.login(settings.EMAIL_USER, settings.EMAIL_APP_PASSWORD)
        return mail
    except Exception as e:
        logger.error(f"Falha ao conectar no IMAP: {e}")
        return None

def fetch_unread_emails():
    """Busca e-mails não lidos no Gmail."""
    mail = connect_imap()
    if not mail:
        return

    try:
        mail.select("inbox")
        
        # Buscar todos os não lidos
        status, messages = mail.search(None, "UNSEEN")
        if status != "OK":
            return
            
        email_ids = messages[0].split()
        
        for e_id in email_ids:
            status, msg_data = mail.fetch(e_id, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    # Decodificar o assunto
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding if encoding else "utf-8")
                        
                    sender = msg.get("From")
                    
                    # Pegar o corpo do e-mail
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            
                            if content_type == "text/plain" and "attachment" not in content_disposition:
                                body = part.get_payload(decode=True).decode('utf-8', errors='replace')
                                break # Focar no plain text
                    else:
                        body = msg.get_payload(decode=True).decode('utf-8', errors='replace')
                        
                    print(f"Novo e-mail de: {sender} | Assunto: {subject}")
                    
                    # Filtro Determinístico Comercial (Regra de encaminhamento do usuário)
                    subject_clean = subject.lower()
                    is_lead = (
                        "você possui um novo lead" in subject_clean or
                        "voce possui um novo lead" in subject_clean or
                        "intenção de compra gerada" in subject_clean or
                        "intencao de compra gerada" in subject_clean
                    )
                    
                    if not is_lead:
                        print(f"[SKIP] E-mail ignorado: não atende aos critérios de assunto de Leads comercial.")
                        # Registrar Log de E-mail Ignorado no Banco
                        db_log = SessionLocal()
                        try:
                            log_entry = models.SystemLog(
                                log_type="EMAIL_IGNORADO",
                                source="IMAP_READER",
                                message=f"E-mail de '{sender}' ignorado. Assunto: '{subject}' (Filtro comercial rígido ativo)."
                            )
                            db_log.add(log_entry)
                            db_log.commit()
                        except Exception as log_err:
                            logger.error(f"Erro ao salvar log: {log_err}")
                        finally:
                            db_log.close()
                        continue
                        
                    # 1. Processar IA (Apenas se for um lead comercial confirmado pelo assunto)
                    ai_data = parse_email_content(f"Subject: {subject}\nSender: {sender}\n\nBody:\n{body}")
                    
                    if ai_data:
                        # 2. Salvar no Banco
                        db: Session = SessionLocal()
                        try:
                            # Tentar distribuir automaticamente (Pega o primeiro vendedor, lógica de MVP)
                            vendedor = db.query(models.User).filter(models.User.role == models.RoleEnum.vendedor).first()
                            
                            novo_lead = models.Lead(
                                name=ai_data.name,
                                email=ai_data.email or sender,
                                phone=ai_data.phone,
                                company=ai_data.company,
                                product_interest=ai_data.product_interest,
                                city_region=ai_data.city_region,
                                source=f"E-mail: {sender}",
                                category=ai_data.category,
                                subcategory=ai_data.subcategory,
                                client_type=ai_data.client_type,
                                tags=ai_data.tags,
                                status=models.LeadStatusEnum.leads_novos,
                                priority=ai_data.priority,
                                urgency_level=ai_data.urgency_level,
                                ai_summary=ai_data.ai_summary,
                                assigned_to_id=vendedor.id if vendedor else None
                            )
                            db.add(novo_lead)
                            db.commit()
                            db.refresh(novo_lead)
                            
                            # Criar timeline do e-mail recebido
                            atividade = models.Activity(
                                lead_id=novo_lead.id,
                                activity_type=models.ActivityTypeEnum.email_recebido,
                                content=f"Assunto: {subject}\n\n{body}"
                            )
                            db.add(atividade)
                            
                            # Registrar Log de Sucesso no Banco
                            log_entry = models.SystemLog(
                                log_type="EMAIL_RECEBIDO",
                                source="IMAP_READER",
                                message=f"Novo lead '{novo_lead.name}' ({novo_lead.email}) capturado com sucesso!"
                            )
                            db.add(log_entry)
                            
                            db.commit()
                            print(f"[SUCCESS] Lead '{ai_data.name}' criado via IMAP com sucesso.")
                            
                        except Exception as db_err:
                            logger.error(f"Erro ao salvar lead no banco: {db_err}")
                            # Registrar Log de Erro no Banco
                            log_entry = models.SystemLog(
                                log_type="ERROR",
                                source="IMAP_READER",
                                message=f"Erro ao gravar lead '{ai_data.name}' no banco: {db_err}"
                            )
                            db.add(log_entry)
                            db.commit()
                            db.rollback()
                        finally:
                            db.close()
                            
    except Exception as e:
        logger.error(f"Erro processando emails: {e}")
        # Registrar Log de Erro Geral no Banco
        db_log = SessionLocal()
        try:
            log_entry = models.SystemLog(
                log_type="ERROR",
                source="IMAP_READER",
                message=f"Erro geral no processador de e-mails: {e}"
            )
            db_log.add(log_entry)
            db_log.commit()
        except:
            pass
        finally:
            db_log.close()
    finally:
        try:
            mail.close()
            mail.logout()
        except:
            pass

from app.services.sla_manager import check_sla_violations

async def email_listener_loop():
    """Loop assíncrono que roda em background junto com a FastAPI."""
    print("Iniciando escuta de e-mails em background (a cada 60s)...")
    while True:
        # 1. Processar novos emails
        if settings.EMAIL_USER and settings.EMAIL_APP_PASSWORD:
            await asyncio.to_thread(fetch_unread_emails)
        else:
            print("⏳ E-mail IMAP não configurado no .env. Pulando verificação de e-mails.")
            
        # 2. Executar validação de SLA
        await asyncio.to_thread(check_sla_violations)
            
        await asyncio.sleep(60) # Checar a cada 1 minuto
