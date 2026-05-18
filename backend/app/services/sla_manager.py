from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db import models
import logging

logger = logging.getLogger(__name__)

# Definimos 4 horas como o SLA padrão do MVP para atendimento inicial
SLA_HOURS_THRESHOLD = 4

def check_sla_violations():
    """
    Varre o banco de dados buscando leads em estágio inicial (novo) que excederam 
    o tempo de atendimento inicial tolerado sem contato registrado.
    """
    logger.info("Executando verificação de SLA...")
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        threshold_time = now - timedelta(hours=SLA_HOURS_THRESHOLD)
        
        # 1. Buscar leads no status 'leads_novos' criados há mais do que o limite e que ainda não foram marcados
        violating_leads = db.query(models.Lead).filter(
            models.Lead.status == 'leads_novos',
            models.Lead.created_at < threshold_time,
            models.Lead.urgency_level != 'SLA Atrasado'
        ).all()
        
        for lead in violating_leads:
            logger.warning(f"[SLA] SLA violado para o lead: {lead.name} (Criado em: {lead.created_at})")
            
            # Atualiza o nível de urgência
            lead.urgency_level = 'SLA Atrasado'
            
            # Registra na timeline do lead
            sla_activity = models.Activity(
                lead_id=lead.id,
                activity_type=models.ActivityTypeEnum.alerta_sla,
                content=f"ALERTA DE SLA: Este lead excedeu o limite de {SLA_HOURS_THRESHOLD} horas sem contato inicial."
            )
            db.add(sla_activity)
            
            # Cria uma tarefa urgente para o vendedor responsável
            vendedor_id = lead.assigned_to_id
            if vendedor_id:
                urgente_task = models.Task(
                    lead_id=lead.id,
                    assigned_to_id=vendedor_id,
                    title="LIGAR URGENTE: SLA Vencido!",
                    description=f"O lead '{lead.name}' está há mais de {SLA_HOURS_THRESHOLD} horas aguardando retorno.",
                    due_date=now + timedelta(minutes=30), # Vendedor tem 30 minutos para matar essa pendência
                    task_type='ligacao'
                )
                db.add(urgente_task)
                
            # Registrar no Log do Sistema para auditoria da chefia
            sla_log = models.SystemLog(
                log_type="WARNING",
                source="SLA_CHECKER",
                message=f"Alerta de SLA estourado disparado para o lead '{lead.name}' (Fila de espera de {SLA_HOURS_THRESHOLD}h estourada)."
            )
            db.add(sla_log)
                
        db.commit()
        if violating_leads:
            logger.info(f"SLA verificado. {len(violating_leads)} leads foram alertados.")
            
    except Exception as e:
        logger.error(f"Erro ao processar rotina de SLA: {e}")
        # Registrar erro de execução
        try:
            err_log = models.SystemLog(
                log_type="ERROR",
                source="SLA_CHECKER",
                message=f"Falha ao executar rotina de SLA: {e}"
            )
            db.add(err_log)
            db.commit()
        except:
            pass
        db.rollback()
    finally:
        db.close()
