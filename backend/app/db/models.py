import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Uuid, Integer
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.db.database import Base

# NOTA ARQUITETURAL: As colunas 'status' e 'priority' da tabela 'leads' são armazenadas como VARCHAR (String)
# no banco de dados para evitar conflitos com o tipo ENUM físico (leadstatusenum) do PostgreSQL.
# Os enums Python abaixo são utilizados apenas para validação em tempo de código (type hints e lógica de negócio).
# Isto garante portabilidade entre SQLite (dev) e PostgreSQL (produção no Render).

class RoleEnum(str, enum.Enum):
    admin = "admin"
    gestor = "gestor"
    vendedor = "vendedor"

class LeadStatusEnum(str, enum.Enum):
    # Novo Fluxo Simplificado
    novo = "novo"
    qualificacao = "qualificacao"
    distribuido = "distribuido"
    venda_realizada = "venda_realizada"
    venda_perdida = "venda_perdida"
    
    # Legado (Mantido para retrocompatibilidade de banco de dados / ENUM types)
    leads_novos = "leads_novos"
    leads_pendentes = "leads_pendentes"
    primeiro_contato_realizado = "primeiro_contato_realizado"
    lead_qualificado = "lead_qualificado"
    enviado_para_vendedor = "enviado_para_vendedor"
    em_negociacao = "em_negociacao"
    venda_ganha = "venda_ganha"

class PriorityEnum(str, enum.Enum):
    baixa = "baixa"
    media = "media"
    alta = "alta"
    critica = "critica"

class TaskTypeEnum(str, enum.Enum):
    ligacao = "ligacao"
    email = "email"
    whatsapp = "whatsapp"
    reuniao = "reuniao"
    outro = "outro"

class ActivityTypeEnum(str, enum.Enum):
    email_recebido = "email_recebido"
    nota_adicionada = "nota_adicionada"
    status_alterado = "status_alterado"
    tarefa_concluida = "tarefa_concluida"
    alerta_sla = "alerta_sla"
    visualizacao = "visualizacao"
    contato_tentativa = "contato_tentativa"

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.vendedor, nullable=False)
    is_paused = Column(Boolean, default=False, nullable=False)
    password_hash = Column(String, nullable=True)
    
    # Relação com equipes
    team_id = Column(Uuid, ForeignKey("teams.id"), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    team = relationship("Team", back_populates="members", foreign_keys=[team_id])
    leads = relationship("Lead", back_populates="assigned_to", foreign_keys="Lead.assigned_to_id")
    tasks = relationship("Task", back_populates="assigned_to")

class Team(Base):
    __tablename__ = "teams"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    
    # Gestor da equipe
    manager_id = Column(Uuid, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    manager = relationship("User", foreign_keys=[manager_id])
    members = relationship("User", back_populates="team", foreign_keys="User.team_id")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    product_interest = Column(String, nullable=True)
    city_region = Column(String, nullable=True)
    source = Column(String, nullable=False) # e.g. "Site", "WhatsApp", "IMAP"
    
    # Categorias do Fluxo Automotivo
    category = Column(String, nullable=True) # e.g. "Veículos Novos", "Veículos Usados", "Locação", "Produtos Agregados"
    subcategory = Column(String, nullable=True) # e.g. "Caminhões MB", "Vans MB", "Seguros", "Consórcios"
    client_type = Column(String, nullable=True) # e.g. "Autônomo", "Frota"
    tags = Column(String, nullable=True) # e.g. "urgente,alto potencial,frota"
    
    # 1. Leads Novos / 2. Pendentes
    visualized_at = Column(DateTime, nullable=True) # Data da primeira visualização
    
    # 3. Primeiro Contato Realizado (Qualificação Inicial)
    vehicle_type = Column(String, nullable=True) # e.g. "Semipesado", "Leve", "Furgão", "Chassi"
    application = Column(String, nullable=True) # e.g. "Carga seca", "Refrigerado", "Baú"
    segment = Column(String, nullable=True) # e.g. "agronegócio", "construção", "logística", "distribuição urbana"
    quantity = Column(Integer, default=1)
    financial_need = Column(String, nullable=True) # e.g. "CDC", "Finame", "Consórcio", "À vista"
    purchase_timeline = Column(String, nullable=True) # e.g. "Imediato", "30 dias", "60 dias"
    urgency = Column(String, nullable=True) # e.g. "Alta", "Média", "Baixa"
    quick_contact_status = Column(String, nullable=True) # e.g. "sem resposta", "retornará depois", "interessado", "inválido", "concorrência"
    
    # 4. Lead Qualificado
    value_range = Column(String, nullable=True)
    down_payment = Column(String, nullable=True)
    finance_amount = Column(String, nullable=True)
    trade_in_used = Column(String, nullable=True) # Usado na troca (Sim/Não ou Detalhes)
    next_action_title = Column(String, nullable=True)
    
    # 6. Em Negociação
    negotiated_value = Column(String, nullable=True)
    finance_institution = Column(String, nullable=True)
    close_probability = Column(String, nullable=True)
    billing_forecast = Column(String, nullable=True)
    
    # 8. Venda Perdida
    loss_reason = Column(String, nullable=True) # e.g. "preço", "concorrência", "sem crédito", etc.
    loss_observation = Column(String, nullable=True)
    reactivation_date = Column(DateTime, nullable=True)
    
    # 9. Venda Realizada
    sale_date = Column(DateTime, nullable=True)
    sale_value = Column(Integer, nullable=True)
    sale_product = Column(String, nullable=True)
    sale_model = Column(String, nullable=True)
    
    # 10. Indicação / Vendedor Externo (Fase Distribuído)
    external_seller_name = Column(String, nullable=True)
    external_department = Column(String, nullable=True)
    external_dealer = Column(String, nullable=True)
    
    # Arquivamento
    is_archived = Column(Boolean, default=False, nullable=False)
    
    # Metadados Gerais
    # IMPORTANT: Armazenado como String/VARCHAR para compatibilidade cross-db (SQLite + PostgreSQL/Render)
    status = Column(String, default="novo", nullable=False, index=True)
    priority = Column(String, default="media", nullable=False)
    urgency_level = Column(String, nullable=True)
    ai_summary = Column(Text, nullable=True)
    
    assigned_to_id = Column(Uuid, ForeignKey("users.id"), nullable=True)
    last_contact_at = Column(DateTime, nullable=True)
    last_interaction_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    assigned_to = relationship("User", back_populates="leads", foreign_keys=[assigned_to_id])
    tasks = relationship("Task", back_populates="lead", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="lead", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    lead_id = Column(Uuid, ForeignKey("leads.id"), nullable=False)
    assigned_to_id = Column(Uuid, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=False)
    is_completed = Column(Boolean, default=False)
    task_type = Column(String, default="outro", nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    lead = relationship("Lead", back_populates="tasks")
    assigned_to = relationship("User", back_populates="tasks")

class Activity(Base):
    __tablename__ = "activities"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    lead_id = Column(Uuid, ForeignKey("leads.id"), nullable=False)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=True) # Null if system/AI
    activity_type = Column(SQLEnum(ActivityTypeEnum), nullable=False)
    content = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lead = relationship("Lead", back_populates="activities")
    user = relationship("User")

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    log_type = Column(String, nullable=False) # 'INFO', 'WARNING', 'ERROR', 'EMAIL_RECEBIDO', 'EMAIL_IGNORADO'
    source = Column(String, nullable=False) # e.g. 'IMAP_READER', 'SLA_CHECKER'
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class LeadRoutingRule(Base):
    __tablename__ = "lead_routing_rules"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    keyword = Column(String, unique=True, index=True, nullable=False)
    action = Column(String, nullable=False) # 'block' ou 'redirect'
    team_id = Column(Uuid, ForeignKey("teams.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    team = relationship("Team", foreign_keys=[team_id])

