from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.db.models import RoleEnum, LeadStatusEnum, PriorityEnum, TaskTypeEnum, ActivityTypeEnum

class UserBase(BaseModel):
    email: str
    name: str
    role: RoleEnum

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: UUID
    team_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[RoleEnum] = None
    team_id: Optional[UUID] = None

class TeamBase(BaseModel):
    name: str
    manager_id: Optional[UUID] = None

class TeamCreate(TeamBase):
    pass

class TeamResponse(TeamBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    manager_id: Optional[UUID] = None

class LeadCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    product_interest: Optional[str] = None
    city_region: Optional[str] = None
    source: str
    
    # Categorias Automotivas
    category: Optional[str] = None
    subcategory: Optional[str] = None
    client_type: Optional[str] = None
    tags: Optional[str] = None
    
    # Primeiro Contato
    visualized_at: Optional[datetime] = None
    vehicle_type: Optional[str] = None
    application: Optional[str] = None
    segment: Optional[str] = None
    quantity: Optional[int] = 1
    financial_need: Optional[str] = None
    purchase_timeline: Optional[str] = None
    urgency: Optional[str] = None
    quick_contact_status: Optional[str] = None
    
    # Qualificação
    value_range: Optional[str] = None
    down_payment: Optional[str] = None
    finance_amount: Optional[str] = None
    trade_in_used: Optional[str] = None
    next_action_title: Optional[str] = None
    
    # Negociação
    negotiated_value: Optional[str] = None
    finance_institution: Optional[str] = None
    close_probability: Optional[str] = None
    billing_forecast: Optional[str] = None
    
    # Perda
    loss_reason: Optional[str] = None
    
    status: Optional[LeadStatusEnum] = LeadStatusEnum.leads_novos
    priority: Optional[PriorityEnum] = PriorityEnum.media
    urgency_level: Optional[str] = None
    ai_summary: Optional[str] = None
    assigned_to_id: Optional[UUID] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    product_interest: Optional[str] = None
    city_region: Optional[str] = None
    
    # Categorias
    category: Optional[str] = None
    subcategory: Optional[str] = None
    client_type: Optional[str] = None
    tags: Optional[str] = None
    
    # Primeiro Contato
    visualized_at: Optional[datetime] = None
    vehicle_type: Optional[str] = None
    application: Optional[str] = None
    segment: Optional[str] = None
    quantity: Optional[int] = None
    financial_need: Optional[str] = None
    purchase_timeline: Optional[str] = None
    urgency: Optional[str] = None
    quick_contact_status: Optional[str] = None
    
    # Qualificação
    value_range: Optional[str] = None
    down_payment: Optional[str] = None
    finance_amount: Optional[str] = None
    trade_in_used: Optional[str] = None
    next_action_title: Optional[str] = None
    
    # Negociação
    negotiated_value: Optional[str] = None
    finance_institution: Optional[str] = None
    close_probability: Optional[str] = None
    billing_forecast: Optional[str] = None
    
    # Perda
    loss_reason: Optional[str] = None
    
    status: Optional[LeadStatusEnum] = None
    priority: Optional[PriorityEnum] = None
    assigned_to_id: Optional[UUID] = None
    last_contact_at: Optional[datetime] = None
    last_interaction_at: Optional[datetime] = None

class LeadResponse(LeadCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime
    last_contact_at: Optional[datetime] = None
    last_interaction_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class TaskCreate(BaseModel):
    lead_id: UUID
    assigned_to_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    due_date: datetime
    task_type: TaskTypeEnum

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: Optional[bool] = None
    task_type: Optional[TaskTypeEnum] = None

class TaskResponse(TaskCreate):
    id: UUID
    is_completed: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ActivityCreate(BaseModel):
    lead_id: UUID
    user_id: Optional[UUID] = None
    activity_type: ActivityTypeEnum
    content: str

class ActivityResponse(ActivityCreate):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SystemLogResponse(BaseModel):
    id: UUID
    log_type: str
    source: str
    message: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
