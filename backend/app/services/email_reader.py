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

def get_next_seller_round_robin(category: str, db: Session) -> models.User | None:
    """Busca o próximo vendedor ativo, não pausado, de forma justa por rodízio (por equipe ou global)."""
    # 1. Obter todos os vendedores ativos e não pausados
    active_sellers = db.query(models.User).filter(
        models.User.role == models.RoleEnum.vendedor,
        models.User.is_paused == False
    ).all()
    
    if not active_sellers:
        return None
        
    # 2. Distribuição por equipes
    # Se houver mais de uma equipe cadastrada, tentar direcionar de acordo com a categoria do lead
    teams = db.query(models.Team).all()
    target_team = None
    if len(teams) > 1 and category:
        category_lower = category.lower()
        for t in teams:
            if t.name.lower() in category_lower or category_lower in t.name.lower():
                target_team = t
                break
                
    if target_team:
        # Filtrar os vendedores ativos e não pausados dessa equipe específica
        team_sellers = [s for s in active_sellers if s.team_id == target_team.id]
        if team_sellers:
            active_sellers = team_sellers
            
    # 3. Lógica matemática de Rodízio (Fair Distribution):
    # Quem recebeu lead há mais tempo (ou nunca recebeu) é o próximo
    selected_seller = None
    oldest_assigned_time = None
    
    for seller in active_sellers:
        # Pega o lead mais recente criado para esse vendedor
        latest_lead = db.query(models.Lead).filter(
            models.Lead.assigned_to_id == seller.id
        ).order_by(models.Lead.created_at.desc()).first()
        
        if not latest_lead:
            # Nunca recebeu um lead -> prioridade máxima absoluta
            return seller
            
        if oldest_assigned_time is None or latest_lead.created_at < oldest_assigned_time:
            oldest_assigned_time = latest_lead.created_at
            selected_seller = seller
            
    return selected_seller


def sanitize_and_enrich_tags(tags_str: str | None, product_interest: str | None) -> str:
    tags_set = set()
    
    # 1. Tratar as tags vindas da IA
    if tags_str:
        # Divide e limpa
        raw_tags = [t.strip().lower() for t in tags_str.split(",") if t.strip()]
        for tag in raw_tags:
            # Filtra "alto potencial" e variações
            if tag in ["alto potencial", "alto-potencial", "alto_potencial"]:
                continue
            # Padroniza sem acentos para algumas tags comuns
            if tag == "autônomo":
                tag = "autonomo"
            tags_set.add(tag)
            
    # 2. Enriquecer com tags do produto de interesse
    if product_interest:
        prod_lower = product_interest.lower()
        if "sprinter" in prod_lower:
            tags_set.add("sprinter")
            tags_set.add("van")
        if "accelo" in prod_lower:
            tags_set.add("accelo")
            tags_set.add("caminhao")
        if "atego" in prod_lower:
            tags_set.add("atego")
            tags_set.add("caminhao")
        if "actros" in prod_lower:
            tags_set.add("actros")
            tags_set.add("caminhao")
        if "arox" in prod_lower:
            tags_set.add("arox")
            tags_set.add("caminhao")
        if "axor" in prod_lower:
            tags_set.add("axor")
            tags_set.add("caminhao")
        if ("caminhão" in prod_lower or "caminhao" in prod_lower) and "caminhao" not in tags_set:
            tags_set.add("caminhao")
            
    return ",".join(sorted(list(tags_set)))


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
            status, msg_data = mail.fetch(e_id, "(BODY.PEEK[])")
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
                        "intencao de compra gerada" in subject_clean or
                        # Suporte a e-mails ENCAMINHADOS (ENC: / FWD:)
                        "enc: você possui um novo lead" in subject_clean or
                        "enc: voce possui um novo lead" in subject_clean or
                        "enc: intenção de compra gerada" in subject_clean or
                        "enc: intencao de compra gerada" in subject_clean or
                        "fwd: você possui um novo lead" in subject_clean or
                        "fwd: voce possui um novo lead" in subject_clean or
                        "fwd: intenção de compra gerada" in subject_clean
                    )
                    
                    if not is_lead:
                        print(f"[SKIP] E-mail ignorado: não atende aos critérios de assunto de Leads comercial.")
                        # Marcar como lido para não re-processar e-mails normais
                        mail.store(e_id, '+FLAGS', '\\Seen')
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
                    
                    # Para e-mails encaminhados (ENC:/FWD:), extrair apenas o conteúdo original
                    # Os separadores mais comuns em encaminhamentos PT-BR e EN são detectados aqui.
                    body_to_parse = body
                    forward_separators = [
                        "---------- mensagem encaminhada ----------",
                        "---------- forwarded message ----------",
                        "de: ",  # Linha de remetente original em e-mails encaminhados do Gmail
                        "begin forwarded message",
                        "mensagem original",
                        "-----original message-----",
                    ]
                    for sep in forward_separators:
                        idx = body_to_parse.lower().find(sep)
                        if idx != -1:
                            # Pega o texto a partir do separador (conteúdo original do lead)
                            extracted = body_to_parse[idx:]
                            # Só substitui se o conteúdo extraído for substancialmente útil (> 100 chars)
                            if len(extracted) > 100:
                                body_to_parse = extracted
                                print(f"[IMAP] E-mail encaminhado detectado. Extraindo corpo real a partir de '{sep[:30]}...'")
                                break
                    
                    # Processar IA com o corpo limpo (body_to_parse já tem o conteúdo real extraído)
                    ai_data = parse_email_content(f"Subject: {subject}\nSender: {sender}\n\nBody:\n{body_to_parse}")

                    if ai_data:
                        # 2. Salvar no Banco
                        db: Session = SessionLocal()
                        try:
                            # Tentar distribuir automaticamente via rodízio inteligente (round-robin)
                            vendedor = get_next_seller_round_robin(ai_data.category, db)
                            
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
                                tags=sanitize_and_enrich_tags(ai_data.tags, ai_data.product_interest),
                                status=models.LeadStatusEnum.novo,
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
                            
                            # Marcar e-mail como lido apenas após persistência e commit bem sucedidos no DB!
                            mail.store(e_id, '+FLAGS', '\\Seen')
                            
                        except Exception as db_err:
                            logger.error(f"Erro ao salvar lead no banco: {db_err}")
                            try:
                                db.rollback()
                                # Registrar Log de Erro no Banco
                                log_entry = models.SystemLog(
                                    log_type="ERROR",
                                    source="IMAP_READER",
                                    message=f"Erro ao gravar lead '{ai_data.name}' no banco: {db_err}"
                                )
                                db.add(log_entry)
                                db.commit()
                            except Exception as log_err:
                                logger.error(f"Erro secundário ao salvar log de erro no banco: {log_err}")
                        finally:
                            db.close()
                    else:
                        print(f"[ERROR] Falha de IA ao processar e-mail de '{sender}'. Marcar como lido para evitar loop.")
                        mail.store(e_id, '+FLAGS', '\\Seen')
                        db_log = SessionLocal()
                        try:
                            log_entry = models.SystemLog(
                                log_type="ERROR",
                                source="IMAP_READER",
                                message=f"Falha de IA (Gemini) ao decodificar conteúdo do Lead. Remetente: '{sender}'. Assunto: '{subject}'."
                            )
                            db_log.add(log_entry)
                            db_log.commit()
                        except Exception as log_err:
                            logger.error(f"Erro ao salvar log: {log_err}")
                        finally:
                            db_log.close()
                            
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
