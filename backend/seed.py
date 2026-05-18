import sys
import os
import uuid
import datetime

# Adicionar a raiz do backend ao PYTHONPATH para conseguir importar 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, engine, Base
from app.db import models

def seed_database():
    print("Iniciando Seed do Banco de Dados com dados comerciais Mercedes-Benz...")
    
    # Certificar de criar as tabelas
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # 1. Limpar banco para ter um ambiente fresh
        db.query(models.SystemLog).delete()
        db.query(models.Activity).delete()
        db.query(models.Task).delete()
        db.query(models.Lead).delete()
        db.query(models.User).delete()
        db.query(models.Team).delete()
        db.commit()

        # 2. Criar Usuários Liderança e Admin
        admin_id = uuid.uuid4()
        user_admin = models.User(
            id=admin_id,
            email="admin@empresa.com",
            name="Fabiano Fachini (Diretor)",
            role=models.RoleEnum.admin
        )
        
        gestor_1_id = uuid.uuid4()
        user_gestor_1 = models.User(
            id=gestor_1_id,
            email="sandra.lozano@denigris.com.br",
            name="Sandra Lozano (Gestora Novos)",
            role=models.RoleEnum.gestor
        )

        gestor_2_id = uuid.uuid4()
        user_gestor_2 = models.User(
            id=gestor_2_id,
            email="roberto.silva@empresa.com",
            name="Roberto Silva (Gestor Seminovos)",
            role=models.RoleEnum.gestor
        )
        
        db.add_all([user_admin, user_gestor_1, user_gestor_2])
        db.commit()

        # 3. Criar Equipes Associando Gestores
        team_1_id = uuid.uuid4()
        team_1 = models.Team(
            id=team_1_id,
            name="Equipe Novos Caminhões",
            manager_id=gestor_1_id
        )

        team_2_id = uuid.uuid4()
        team_2 = models.Team(
            id=team_2_id,
            name="Equipe Seminovos",
            manager_id=gestor_2_id
        )
        db.add_all([team_1, team_2])
        db.commit()

        # 4. Criar Vendedores Associados às Equipes
        vendedor_1_id = uuid.uuid4()
        user_vendedor_1 = models.User(
            id=vendedor_1_id,
            email="vendedor.novos@empresa.com",
            name="Vendedor Ativo (Novos)",
            role=models.RoleEnum.vendedor,
            team_id=team_1_id
        )

        vendedor_2_id = uuid.uuid4()
        user_vendedor_2 = models.User(
            id=vendedor_2_id,
            email="vendedor.seminovos@empresa.com",
            name="Lucas Souza (Seminovos)",
            role=models.RoleEnum.vendedor,
            team_id=team_2_id
        )
        db.add_all([user_vendedor_1, user_vendedor_2])
        db.commit()

        now = datetime.datetime.now(datetime.timezone.utc)

        # 5. Criar Leads representando o fluxo de 8 etapas comerciais
        
        # Etapa 1: Leads Novos (Carlos - Atego 2430)
        lead_1_id = uuid.uuid4()
        lead_1 = models.Lead(
            id=lead_1_id,
            name="Carlos Eduardo",
            email="carlos@transportessilva.com.br",
            phone="(11) 99999-1111",
            company="Transportes Silva Ltda",
            product_interest="2x Atego 2430 Semipesado",
            city_region="Campinas - SP",
            source="E-mail: Contato Site",
            category="Veículos Novos",
            subcategory="Caminhões Mercedes-Benz",
            client_type="Frota",
            tags="urgente,frota,alto potencial",
            status=models.LeadStatusEnum.leads_novos,
            priority=models.PriorityEnum.alta,
            urgency_level="Urgente - Cliente deseja comprar ainda este mês.",
            ai_summary="Cliente de frota interessado em 2 caminhões Atego 2430 para logística rodoviária de carga seca. Demonstrou pressa devido a novos contratos.",
            assigned_to_id=vendedor_1_id
        )

        # Etapa 2: Leads Pendentes (Mariana - Sprinter Furgão)
        lead_2_id = uuid.uuid4()
        lead_2 = models.Lead(
            id=lead_2_id,
            name="Mariana Mendes",
            email="mariana@expresslog.com.br",
            phone="(41) 98888-2222",
            company="Logística Express",
            product_interest="Sprinter Furgão 417",
            city_region="Curitiba - PR",
            source="Marketplace Webmotors",
            category="Veículos Novos",
            subcategory="Vans Mercedes-Benz",
            client_type="Frota",
            tags="frota",
            status=models.LeadStatusEnum.leads_pendentes,
            priority=models.PriorityEnum.media,
            visualized_at=now - datetime.timedelta(hours=2),
            ai_summary="Procura vans Sprinter furgão para distribuição urbana logística. E-mail lido, aguardando primeiro contato oficial do vendedor.",
            assigned_to_id=vendedor_1_id
        )

        # Etapa 3: Primeiro Contato Realizado (Adilson - Caçamba Usado)
        lead_3_id = uuid.uuid4()
        lead_3 = models.Lead(
            id=lead_3_id,
            name="Adilson Rocha",
            email="adilson@rocha.com.br",
            phone="(19) 97777-3333",
            product_interest="Caminhão Basculante Caçamba",
            city_region="Piracicaba - SP",
            source="WhatsApp Comercial",
            category="Veículos Usados",
            subcategory="Caminhões usados",
            client_type="Autônomo",
            tags="autonomo",
            status=models.LeadStatusEnum.primeiro_contato_realizado,
            priority=models.PriorityEnum.media,
            vehicle_type="Pesado Basculante",
            application="Construção Civil e Areia",
            segment="construção",
            quantity=1,
            financial_need="Consórcio Contemplado",
            purchase_timeline="30 dias",
            urgency="Média",
            quick_contact_status="interessado",
            ai_summary="Cliente autônomo. Trabalha com caçamba em obras. Possui carta de consórcio contemplada de 250k e busca seminovo truck.",
            assigned_to_id=vendedor_2_id
        )

        # Etapa 4: Lead Qualificado (Valéria - Locação Sprinter)
        lead_4_id = uuid.uuid4()
        lead_4 = models.Lead(
            id=lead_4_id,
            name="Valéria Santos",
            email="valeria.santos@rapidoentrega.com",
            phone="(11) 96666-4444",
            company="Rápido Entrega Logística",
            product_interest="Locação de 5 Vans Sprinter",
            city_region="São Paulo - SP",
            source="Indicação Comercial",
            category="Locação",
            subcategory="Locação de Vans",
            client_type="Frota",
            tags="alto potencial,indicacao",
            status=models.LeadStatusEnum.lead_qualificado,
            priority=models.PriorityEnum.alta,
            value_range="500.000,00",
            down_payment="Contrato 48 Meses",
            finance_amount="0,00",
            trade_in_used="Não",
            next_action_title="Enviar proposta comercial de contrato longo (48 meses) com plano de manutenção embutido",
            ai_summary="Lead qualificado com faturamento aprovado. Busca locação corporativa de 5 vans Sprinter por 48 meses. Oportunidade de cross-sell de seguros.",
            assigned_to_id=vendedor_1_id
        )

        # Etapa 5: Enviado para Vendedor (José - Axor)
        lead_5_id = uuid.uuid4()
        lead_5 = models.Lead(
            id=lead_5_id,
            name="José Rodrigues",
            email="jose@fazendabomjesus.com.br",
            phone="(67) 95555-5555",
            company="Fazenda Bom Jesus",
            product_interest="Caminhão Axor Tracionado",
            city_region="Campo Grande - MS",
            source="Site",
            category="Veículos Novos",
            subcategory="Caminhões Mercedes-Benz",
            client_type="Frota",
            tags="frota,alto potencial",
            status=models.LeadStatusEnum.enviado_para_vendedor,
            priority=models.PriorityEnum.critica,
            ai_summary="Cliente do agronegócio interessado em Axor tracionado para escoamento de grãos. Lead distribuído para o vendedor iniciar follow-up ativo.",
            assigned_to_id=vendedor_1_id
        )

        # Etapa 6: Em Negociação (Transportes Rodoviários - Actros)
        lead_6_id = uuid.uuid4()
        lead_6 = models.Lead(
            id=lead_6_id,
            name="Geraldo Neto",
            email="geraldo@transportesnacional.com",
            phone="(11) 94444-6666",
            company="Transportadora Nacional",
            product_interest="4x Actros 2548 Estrada",
            city_region="Santos - SP",
            source="Contato Direto Fone",
            category="Veículos Novos",
            subcategory="Caminhões Mercedes-Benz",
            client_type="Frota",
            tags="frota,alto potencial,concorrencia",
            status=models.LeadStatusEnum.em_negociacao,
            priority=models.PriorityEnum.critica,
            value_range="3.200.000,00",
            down_payment="800.000,00",
            finance_amount="2.400.000,00",
            trade_in_used="Sim - 2 Ategos Usados na troca",
            negotiated_value="3.150.000,00",
            finance_institution="Banco Mercedes-Benz",
            close_probability="85%",
            billing_forecast="Próximos 15 dias",
            ai_summary="Negociação avançada de 4 cavalos mecânicos Actros. Proposta sob análise de crédito no Banco Mercedes. Avaliação dos Ategos usados concluída.",
            assigned_to_id=vendedor_1_id
        )

        # Etapa 7: Venda Ganha (Carlos - Seminovos Scania)
        lead_7_id = uuid.uuid4()
        lead_7 = models.Lead(
            id=lead_7_id,
            name="Carlos Antunes",
            email="antunes@terraplanagem.com",
            phone="(11) 93333-7777",
            company="Antunes Terraplanagem",
            product_interest="Caminhão Caçamba Scania Seminovo",
            city_region="Sorocaba - SP",
            source="Marketplace Mercado Livre",
            category="Veículos Usados",
            subcategory="Caminhões usados",
            client_type="Frota",
            tags="cliente ativo",
            status=models.LeadStatusEnum.venda_ganha,
            priority=models.PriorityEnum.media,
            negotiated_value="280.000,00",
            finance_institution="Banco Itaú",
            close_probability="100%",
            ai_summary="Venda fechada e faturada! Oportunidade futura disparada automaticamente para cross-sell de Seguro Comercial De Nigris e plano de manutenção preventiva.",
            assigned_to_id=vendedor_2_id
        )

        # Etapa 8: Venda Perdida (Logística Lages - Vans MB)
        lead_8_id = uuid.uuid4()
        lead_8 = models.Lead(
            id=lead_8_id,
            name="Roberto Lages",
            email="diretoria@lageslog.com.br",
            phone="(47) 92222-8888",
            company="Lages Logística",
            product_interest="3x Vans Sprinter Furgão",
            city_region="Joinville - SC",
            source="Site",
            category="Veículos Novos",
            subcategory="Vans Mercedes-Benz",
            client_type="Frota",
            tags="concorrencia",
            status=models.LeadStatusEnum.venda_perdida,
            priority=models.PriorityEnum.media,
            loss_reason="concorrência",
            ai_summary="Lead perdido. Compraram vans da marca concorrente (Ford Transit) devido a taxa de juros subsidiada agressiva da montadora concorrente.",
            assigned_to_id=vendedor_1_id
        )

        db.add_all([lead_1, lead_2, lead_3, lead_4, lead_5, lead_6, lead_7, lead_8])
        db.commit()

        # 6. Criar Histórico de Atividades (Timeline)
        activity_1 = models.Activity(
            lead_id=lead_1_id,
            activity_type=models.ActivityTypeEnum.email_recebido,
            content="Assunto: Você possui um novo Lead - Atego Semipesado\n\nOlá, gostaria de receber cotação urgente para 2 caminhões Mercedes Atego 2430 novos. Temos pressa na aquisição pois fechamos uma rota de transporte rodoviário em Campinas."
        )
        activity_2 = models.Activity(
            lead_id=lead_6_id,
            activity_type=models.ActivityTypeEnum.status_alterado,
            content="Status alterado de Enviado para Vendedor para Em Negociação pelo vendedor.",
            user_id=vendedor_1_id
        )
        activity_3 = models.Activity(
            lead_id=lead_6_id,
            activity_type=models.ActivityTypeEnum.nota_adicionada,
            content="Reunião presencial na transportadora. Avaliamos os 2 caminhões usados Atego oferecidos na troca. Crédito de 2.4M enviado ao Banco Mercedes-Benz.",
            user_id=vendedor_1_id
        )
        
        db.add_all([activity_1, activity_2, activity_3])
        db.commit()
        
        # 7. Criar Tarefas
        
        # Tarefa 1: Atrasada (Ligar para Carlos)
        task_1 = models.Task(
            lead_id=lead_1_id,
            assigned_to_id=vendedor_1_id,
            title="Ligar para iniciar qualificação inicial",
            due_date=now - datetime.timedelta(hours=5), # Atrasada
            task_type=models.TaskTypeEnum.ligacao
        )
        
        # Tarefa 2: Do Dia (Enviar proposta para Valéria)
        task_2 = models.Task(
            lead_id=lead_4_id,
            assigned_to_id=vendedor_1_id,
            title="Enviar proposta de locação de Vans (48 Meses)",
            due_date=now + datetime.timedelta(hours=2), # Hoje
            task_type=models.TaskTypeEnum.email
        )

        # Tarefa 3: Follow-up de Negociação parada (Aviso para Geraldo)
        task_3 = models.Task(
            lead_id=lead_6_id,
            assigned_to_id=vendedor_1_id,
            title="Cobrar aprovação da ficha de crédito do Banco Mercedes",
            due_date=now + datetime.timedelta(days=1), # Amanhã
            task_type=models.TaskTypeEnum.whatsapp
        )
        
        db.add_all([task_1, task_2, task_3])
        
        # 8. Criar Logs de Auditoria do Robô de e-mails
        log_1 = models.SystemLog(
            log_type="INFO",
            source="SYSTEM_SETUP",
            message="Banco de dados inicializado e limpo pelo Seed Corporativo De Nigris."
        )
        log_2 = models.SystemLog(
            log_type="EMAIL_RECEBIDO",
            source="IMAP_READER",
            message="Novo lead 'Carlos Eduardo' (carlos@transportessilva.com.br) capturado via robô. Assunto: 'Você possui um novo Lead - Atego Semipesado'. AI processada com sucesso."
        )
        log_3 = models.SystemLog(
            log_type="EMAIL_IGNORADO",
            source="IMAP_READER",
            message="E-mail de 'notificacoes@faturamento.com.br' ignorado. Assunto: 'Relatório Financeiro do Faturamento Semanal' (Filtro comercial rígido ativo)."
        )
        db.add_all([log_1, log_2, log_3])
        db.commit()
        
        print("Seed finalizado com sucesso! Estrutura corporativa Mercedes-Benz populada.")

    except Exception as e:
        print(f"Erro ao popular banco de dados com seed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
