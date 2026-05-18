from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import datetime
from app.db.database import get_db
from app.db import models
from app.schemas import crm
from app.core import security

router = APIRouter()

# --- LEADS ---

@router.get("/leads", response_model=List[crm.LeadResponse], tags=["Leads"])
def get_leads(db: Session = Depends(get_db)):
    """Busca todos os leads."""
    return db.query(models.Lead).order_by(models.Lead.created_at.desc()).all()

@router.post("/leads", response_model=crm.LeadResponse, tags=["Leads"], status_code=status.HTTP_201_CREATED)
def create_lead(lead_in: crm.LeadCreate, db: Session = Depends(get_db)):
    """Cria um novo lead e gera a atividade inicial."""
    lead = models.Lead(**lead_in.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    # Criar atividade inicial
    activity = models.Activity(
        lead_id=lead.id,
        activity_type=models.ActivityTypeEnum.email_recebido,
        content=f"Lead criado via {lead.source}."
    )
    db.add(activity)
    db.commit()
    
    return lead

@router.patch("/leads/{lead_id}", response_model=crm.LeadResponse, tags=["Leads"])
def update_lead(lead_id: UUID, lead_in: crm.LeadUpdate, db: Session = Depends(get_db)):
    """Atualiza informações do lead, como status ou responsável."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = lead_in.model_dump(exclude_unset=True)
    status_changed = False
    assigned_changed = False
    old_status = lead.status
    old_assigned_to = lead.assigned_to_id
    
    if "status" in update_data and update_data["status"] != lead.status:
        status_changed = True
        
    if "assigned_to_id" in update_data and update_data["assigned_to_id"] != lead.assigned_to_id:
        assigned_changed = True
            
    # Sempre atualiza a data da última interação
    lead.last_interaction_at = datetime.datetime.now(datetime.timezone.utc)
        
    for field, value in update_data.items():
        setattr(lead, field, value)
        
    db.add(lead)
    
    if status_changed:
        activity = models.Activity(
            lead_id=lead.id,
            activity_type=models.ActivityTypeEnum.status_alterado,
            content=f"Status alterado de '{old_status.value}' para '{lead.status.value}'."
        )
        db.add(activity)
        
    if assigned_changed:
        new_user = db.query(models.User).filter(models.User.id == lead.assigned_to_id).first() if lead.assigned_to_id else None
        old_user = db.query(models.User).filter(models.User.id == old_assigned_to).first() if old_assigned_to else None
        
        old_name = old_user.name if old_user else "Sistema"
        new_name = new_user.name if new_user else "Nenhum"
        
        activity = models.Activity(
            lead_id=lead.id,
            activity_type=models.ActivityTypeEnum.nota_adicionada,
            content=f"Responsabilidade transferida: de {old_name} para {new_name}."
        )
        db.add(activity)
        
    db.commit()
    db.refresh(lead)
    return lead


# --- ACTIVITIES ---

@router.get("/leads/{lead_id}/activities", response_model=List[crm.ActivityResponse], tags=["Activities"])
def get_activities(lead_id: UUID, db: Session = Depends(get_db)):
    """Busca a timeline (histórico) do lead."""
    return db.query(models.Activity).filter(models.Activity.lead_id == lead_id).order_by(models.Activity.created_at.desc()).all()

@router.post("/leads/{lead_id}/activities", response_model=crm.ActivityResponse, tags=["Activities"])
def add_activity(lead_id: UUID, activity_in: crm.ActivityCreate, db: Session = Depends(get_db)):
    """Adiciona uma nota manual na timeline do lead."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    activity = models.Activity(**activity_in.model_dump())
    db.add(activity)
    
    # Atualiza last_contact_at
    lead.last_contact_at = datetime.datetime.now(datetime.timezone.utc)
    db.add(lead)
    
    db.commit()
    db.refresh(activity)
    return activity


# --- TASKS ---

@router.get("/tasks", response_model=List[crm.TaskResponse], tags=["Tasks"])
def get_tasks(user_id: UUID = None, db: Session = Depends(get_db)):
    """Busca tarefas da agenda operacional, filtradas opcionalmente pelo vendedor responsável."""
    query = db.query(models.Task)
    if user_id:
        query = query.filter(models.Task.assigned_to_id == user_id)
    return query.order_by(models.Task.due_date.asc()).all()

@router.post("/tasks", response_model=crm.TaskResponse, tags=["Tasks"])
def create_task(task_in: crm.TaskCreate, db: Session = Depends(get_db)):
    task = models.Task(**task_in.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.patch("/tasks/{task_id}", response_model=crm.TaskResponse, tags=["Tasks"])
def complete_task(task_id: UUID, task_update: crm.TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    update_data = task_update.model_dump(exclude_unset=True)
    is_completed_changed = False
    
    if "is_completed" in update_data and update_data["is_completed"] is True and not task.is_completed:
        is_completed_changed = True
        
    for field, value in update_data.items():
        setattr(task, field, value)
        
    db.add(task)
    
    if is_completed_changed:
        activity = models.Activity(
            lead_id=task.lead_id,
            activity_type=models.ActivityTypeEnum.tarefa_concluida,
            content=f"Tarefa concluída: {task.title}"
        )
        db.add(activity)
        
    db.commit()
    db.refresh(task)
    return task


# --- SYSTEM LOGS & AUDITING ---

@router.get("/system-logs", response_model=List[crm.SystemLogResponse], tags=["System Logs"])
def get_system_logs(db: Session = Depends(get_db)):
    """Busca os últimos 100 registros de logs do robô de e-mails e SLA para auditoria."""
    return db.query(models.SystemLog).order_by(models.SystemLog.created_at.desc()).limit(100).all()


# --- TEAMS & USERS MANAGEMENT ---

@router.get("/teams", response_model=List[crm.TeamResponse], tags=["Teams"])
def get_teams(db: Session = Depends(get_db)):
    """Lista todas as equipes comerciais do sistema."""
    return db.query(models.Team).all()

@router.post("/teams", response_model=crm.TeamResponse, tags=["Teams"], status_code=status.HTTP_201_CREATED)
def create_team(team_in: crm.TeamCreate, db: Session = Depends(get_db)):
    """Cria uma nova equipe comercial."""
    team = models.Team(**team_in.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team

@router.get("/users", response_model=List[crm.UserResponse], tags=["Users"])
def get_users(db: Session = Depends(get_db)):
    """Lista todos os usuários comerciais cadastrados no CRM."""
    return db.query(models.User).order_by(models.User.name.asc()).all()

@router.post("/login", response_model=crm.TokenResponse, tags=["Authentication"])
def login(login_in: crm.UserLogin, db: Session = Depends(get_db)):
    """Realiza a autenticação do profissional comercial e retorna o token JWT."""
    user = db.query(models.User).filter(models.User.email == login_in.email).first()
    if not user or not security.verify_password(login_in.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos.")
        
    access_token = security.create_access_token(user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/users", response_model=crm.UserResponse, tags=["Users"], status_code=status.HTTP_201_CREATED)
def create_user(user_in: crm.UserCreate, db: Session = Depends(get_db)):
    """Cadastra um novo profissional comercial (vendedor, gestor ou admin)."""
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado no sistema.")
    
    user_data = user_in.model_dump()
    password = user_data.pop("password", None) or "denigris123"
    
    user = models.User(**user_data)
    user.password_hash = security.hash_password(password)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}", response_model=crm.UserResponse, tags=["Users"])
def update_user(user_id: UUID, user_in: crm.UserUpdate, team_id: UUID = None, db: Session = Depends(get_db)):
    """Atualiza informações do profissional comercial (aceita body ou query parameter team_id para retrocompatibilidade)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = user_in.model_dump(exclude_unset=True)
    
    # Se team_id for passado na query string (retrocompatibilidade)
    if team_id is not None:
        user.team_id = team_id
        
    # Validação de e-mail duplicado
    if "email" in update_data and update_data["email"] != user.email:
        existing = db.query(models.User).filter(models.User.email == update_data["email"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado no sistema.")
            
    password = update_data.pop("password", None)
    if password:
        user.password_hash = security.hash_password(password)
            
    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}", tags=["Users"])
def delete_user(user_id: UUID, db: Session = Depends(get_db)):
    """Exclui um profissional comercial."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Desassociar de leads e tarefas para evitar erros de integridade
    db.query(models.Lead).filter(models.Lead.assigned_to_id == user_id).update({models.Lead.assigned_to_id: None})
    db.query(models.Task).filter(models.Task.assigned_to_id == user_id).update({models.Task.assigned_to_id: None})
    
    # Se ele for gerente de alguma equipe, remover ele de gerente
    db.query(models.Team).filter(models.Team.manager_id == user_id).update({models.Team.manager_id: None})
    
    db.delete(user)
    db.commit()
    return {"message": "Profissional excluído com sucesso."}

@router.patch("/teams/{team_id}", response_model=crm.TeamResponse, tags=["Teams"])
def update_team(team_id: UUID, team_in: crm.TeamUpdate, db: Session = Depends(get_db)):
    """Edita as informações de uma equipe comercial."""
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    update_data = team_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)
        
    db.add(team)
    db.commit()
    db.refresh(team)
    return team

@router.delete("/teams/{team_id}", tags=["Teams"])
def delete_team(team_id: UUID, db: Session = Depends(get_db)):
    """Exclui uma equipe comercial e desassocia todos os membros dela."""
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    # Desassociar todos os vendedores que pertenciam a esta equipe
    db.query(models.User).filter(models.User.team_id == team_id).update({models.User.team_id: None})
    
    db.delete(team)
    db.commit()
    return {"message": "Equipe comercial excluída com sucesso."}
