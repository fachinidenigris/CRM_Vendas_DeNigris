from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import datetime
from app.db.database import get_db
from app.db import models
from app.schemas import crm
from app.core import security
from app.core.email import send_reset_password_email

router = APIRouter()

@router.get("/debug-db-status", tags=["Debug"])
def debug_db_status(db: Session = Depends(get_db)):
    try:
        from sqlalchemy import text
        # 1. Informações das colunas da tabela leads
        col_query = text("""
            SELECT column_name, data_type, udt_name, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'leads' AND (table_schema = 'public' OR table_schema IS NOT NULL);
        """)
        cols = db.execute(col_query).fetchall()
        cols_list = []
        for r in cols:
            cols_list.append({
                "column_name": r[0],
                "data_type": r[1],
                "udt_name": r[2],
                "column_default": r[3]
            })

        # 2. Informações de constraints da tabela leads
        cons_list = []
        try:
            cons_query = text("""
                SELECT conname, pg_get_constraintdef(c.oid)
                FROM pg_constraint c
                JOIN pg_namespace n ON n.oid = c.connamespace
                WHERE conrelid = 'leads'::regclass;
            """)
            cons = db.execute(cons_query).fetchall()
            for r in cons:
                cons_list.append({
                    "constraint_name": r[0],
                    "definition": r[1]
                })
        except Exception as ce:
            cons_list.append({"error": str(ce)})

        # 3. Últimos 15 logs do sistema
        logs = db.query(models.SystemLog).order_by(models.SystemLog.created_at.desc()).limit(15).all()
        logs_list = []
        for l in logs:
            logs_list.append({
                "id": str(l.id),
                "log_type": l.log_type,
                "source": l.source,
                "message": l.message,
                "created_at": l.created_at.isoformat() if l.created_at else None
            })

        return {
            "status": "success",
            "columns": cols_list,
            "constraints": cons_list,
            "logs": logs_list
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# --- LEADS ---

@router.get("/leads", response_model=List[crm.LeadResponse], tags=["Leads"])
def get_leads(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Busca todos os leads filtrados de forma segura a nível comercial."""
    # Auto-Arquivamento (Zero Cost - sem CRON)
    threshold_date = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    
    leads_to_archive = db.query(models.Lead).filter(
        models.Lead.status.in_([models.LeadStatusEnum.venda_realizada, models.LeadStatusEnum.venda_perdida]),
        models.Lead.is_archived == False,
        models.Lead.updated_at < threshold_date
    ).all()
    
    if leads_to_archive:
        for l in leads_to_archive:
            l.is_archived = True
        db.commit()

    query = db.query(models.Lead)
    
    # Restrição de Escopo de Visualização Rígida (Database Level Isolation)
    if current_user.role == models.RoleEnum.vendedor:
        # Vendedor só vê leads atribuídos a si mesmo
        query = query.filter(models.Lead.assigned_to_id == current_user.id)
    elif current_user.role == models.RoleEnum.gestor:
        # Gestor visualiza os leads do seu próprio time comercial + leads órfãos/não distribuídos
        if current_user.team_id:
            membros = db.query(models.User.id).filter(models.User.team_id == current_user.team_id).subquery()
            query = query.filter(
                (models.Lead.assigned_to_id.in_(membros)) | 
                (models.Lead.assigned_to_id == None)
            )

    return query.order_by(models.Lead.created_at.desc()).all()

@router.post("/leads", response_model=crm.LeadResponse, tags=["Leads"], status_code=status.HTTP_201_CREATED)
def create_lead(
    lead_in: crm.LeadCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Cria um novo lead e gera a atividade inicial com distribuição automática."""
    lead_data = lead_in.model_dump()
    
    # Se não foi atribuído a nenhum vendedor de forma explícita, aplica a distribuição automática (Round-Robin)
    if not lead_data.get("assigned_to_id"):
        from app.services.email_reader import get_next_seller_round_robin
        vendedor = get_next_seller_round_robin(lead_data.get("category") or "", db)
        if vendedor:
            lead_data["assigned_to_id"] = vendedor.id
            lead_data["status"] = models.LeadStatusEnum.distribuido
            
    lead = models.Lead(**lead_data)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    # Criar atividade inicial
    dist_info = f"e distribuído para {lead.assigned_to.name}" if lead.assigned_to_id else "aguardando atribuição"
    activity = models.Activity(
        lead_id=lead.id,
        activity_type=models.ActivityTypeEnum.email_recebido,
        content=f"Lead cadastrado via {lead.source} {dist_info}."
    )
    db.add(activity)
    db.commit()
    
    return lead

@router.patch("/leads/{lead_id}", response_model=crm.LeadResponse, tags=["Leads"])
def update_lead(
    lead_id: UUID, 
    lead_in: crm.LeadUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Atualiza informações do lead, como status ou responsável."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # Restrição de Escopo: Vendedor comum só pode editar seus próprios leads
    if current_user.role == models.RoleEnum.vendedor and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão de edição para este lead.")
    
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
            content=f"Status alterado de '{old_status}' para '{lead.status}'."
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
def get_activities(
    lead_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Busca a timeline (histórico) do lead."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    if current_user.role == models.RoleEnum.vendedor and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para visualizar este lead.")
        
    return db.query(models.Activity).filter(models.Activity.lead_id == lead_id).order_by(models.Activity.created_at.desc()).all()

@router.post("/leads/{lead_id}/activities", response_model=crm.ActivityResponse, tags=["Activities"])
def add_activity(
    lead_id: UUID, 
    activity_in: crm.ActivityCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Adiciona uma nota manual na timeline do lead."""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    if current_user.role == models.RoleEnum.vendedor and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para alterar este lead.")
        
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
def get_tasks(
    user_id: UUID = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Busca tarefas da agenda operacional, filtradas de forma segura de acordo com o papel comercial."""
    query = db.query(models.Task)
    
    if current_user.role == models.RoleEnum.vendedor:
        # Vendedor só acessa suas próprias tarefas
        query = query.filter(models.Task.assigned_to_id == current_user.id)
    elif user_id:
        query = query.filter(models.Task.assigned_to_id == user_id)
        
    return query.order_by(models.Task.due_date.asc()).all()

@router.post("/tasks", response_model=crm.TaskResponse, tags=["Tasks"])
def create_task(
    task_in: crm.TaskCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    task = models.Task(**task_in.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.patch("/tasks/{task_id}", response_model=crm.TaskResponse, tags=["Tasks"])
def complete_task(
    task_id: UUID, 
    task_update: crm.TaskUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if current_user.role == models.RoleEnum.vendedor and task.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para alterar esta tarefa.")
        
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
def get_system_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Busca os últimos 100 registros de logs do robô de e-mails e SLA para auditoria."""
    if current_user.role == models.RoleEnum.vendedor:
        raise HTTPException(status_code=403, detail="Acesso negado. Logs restritos a administradores ou gestores.")
    return db.query(models.SystemLog).order_by(models.SystemLog.created_at.desc()).limit(100).all()


# --- TEAMS & USERS MANAGEMENT ---

@router.get("/teams", response_model=List[crm.TeamResponse], tags=["Teams"])
def get_teams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Lista todas as equipes comerciais do sistema."""
    if current_user.role == models.RoleEnum.vendedor:
        raise HTTPException(status_code=403, detail="Acesso negado.")
    return db.query(models.Team).all()

@router.post("/teams", response_model=crm.TeamResponse, tags=["Teams"], status_code=status.HTTP_201_CREATED)
def create_team(
    team_in: crm.TeamCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Cria uma nova equipe comercial."""
    if current_user.role == models.RoleEnum.vendedor:
        raise HTTPException(status_code=403, detail="Acesso negado.")
    team = models.Team(**team_in.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team

@router.get("/users", response_model=List[crm.UserResponse], tags=["Users"])
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
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

@router.post("/forgot-password", tags=["Authentication"])
def forgot_password(payload: crm.ForgotPassword, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Inicia o fluxo de redefinição enviando um e-mail com token temporário."""
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        return {"msg": "Se o e-mail existir, um link de recuperação foi enviado."}
        
    token = security.create_access_token(user.id, expires_delta=datetime.timedelta(hours=1))
    
    # Envio assíncrono para não travar a resposta HTTP
    background_tasks.add_task(send_reset_password_email, user.email, token)
    return {"msg": "Se o e-mail existir, um link de recuperação foi enviado."}

@router.post("/reset-password", tags=["Authentication"])
def reset_password(payload: crm.ResetPassword, db: Session = Depends(get_db)):
    """Redefine a senha do usuário utilizando o token validado."""
    user_id_str = security.decode_access_token(payload.token)
    if not user_id_str:
        raise HTTPException(status_code=400, detail="Token expirado ou inválido")
        
    user_id = UUID(user_id_str)
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    user.password_hash = security.hash_password(payload.new_password)
    db.commit()
    return {"msg": "Senha redefinida com sucesso."}

@router.post("/users", response_model=crm.UserResponse, tags=["Users"], status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: crm.UserCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Cadastra um novo profissional comercial (vendedor, gestor ou admin)."""
    if current_user.role == models.RoleEnum.vendedor:
        raise HTTPException(status_code=403, detail="Acesso negado.")
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
def update_user(
    user_id: UUID, 
    user_in: crm.UserUpdate, 
    team_id: UUID = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Atualiza informações do profissional comercial (aceita body ou query parameter team_id para retrocompatibilidade)."""
    if current_user.role == models.RoleEnum.vendedor and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Acesso negado.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = user_in.model_dump(exclude_unset=True)
    
    # Se team_id for passado na query string (retrocompatibilidade)
    if team_id is not None:
        if current_user.role == models.RoleEnum.vendedor:
            raise HTTPException(status_code=403, detail="Acesso negado.")
        user.team_id = team_id
        
    # Validação de e-mail duplicado
    if "email" in update_data and update_data["email"] != user.email:
        if current_user.role == models.RoleEnum.vendedor:
            raise HTTPException(status_code=403, detail="Acesso negado.")
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
def delete_user(
    user_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Exclui um profissional comercial."""
    if current_user.role == models.RoleEnum.vendedor:
        raise HTTPException(status_code=403, detail="Acesso negado.")
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
def update_team(
    team_id: UUID, 
    team_in: crm.TeamUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Edita as informações de uma equipe comercial."""
    if current_user.role == models.RoleEnum.vendedor:
        raise HTTPException(status_code=403, detail="Acesso negado.")
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
def delete_team(
    team_id: UUID, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Exclui uma equipe comercial e desassocia todos os membros dela."""
    if current_user.role == models.RoleEnum.vendedor:
        raise HTTPException(status_code=403, detail="Acesso negado.")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
        
    # Desassociar todos os vendedores que pertenciam a esta equipe
    db.query(models.User).filter(models.User.team_id == team_id).update({models.User.team_id: None})
    
    db.delete(team)
    db.commit()
    return {"message": "Equipe comercial excluída com sucesso."}
