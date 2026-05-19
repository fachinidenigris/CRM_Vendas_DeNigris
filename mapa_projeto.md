# 🗺️ Mapa de Arquitetura e Contexto do Projeto - CRM Vendas DeNigris

Este mapa serve como um guia de referência rápido de alta fidelidade de todos os arquivos, modelos de banco de dados, fluxos de integração de IA, endpoints de API e telas do frontend.

---

## 📂 1. Estrutura Geral do Diretório
*   `backend/`: Código-fonte da API Python (FastAPI).
    *   `app/main.py`: Ponto de entrada, CORS, semente do banco e loop do robô IMAP.
    *   `app/core/config.py`: Variáveis de ambiente e segredos (Groq API, Gemini, IMAP).
    *   `app/db/database.py`: Conexão do SQLAlchemy (SQLite local / PostgreSQL Render).
    *   `app/db/models.py`: Modelos físicos do banco de dados (leads, tasks, users, logs).
    *   `app/api/routes.py`: Endpoints da API REST (autenticação, leads, tarefas, logs, equipes).
    *   `app/services/email_reader.py`: Robô IMAP que lê, sanitiza e distribui e-mails.
    *   `app/services/ai_parser.py`: Parser de contingência tripla (Groq -> Gemini -> Regex).
*   `frontend/`: Aplicação web Next.js (App Router, Tailwind, React, TypeScript).
    *   `src/app/page.tsx`: Tela Inicial (Agenda de hoje/calendário do vendedor).
    *   `src/app/kanban/page.tsx`: Tela do Quadro Kanban de leads.
    *   `src/app/historico/page.tsx`: Histórico de Fechamentos (Leads fechados e arquivos de propostas).
    *   `src/app/relatorios/page.tsx`: Painel de Indicadores Analytics.
    *   `src/app/marketing/page.tsx`: Painel de Automação de E-mail Marketing (Beta).
    *   `src/app/logs/page.tsx`: Painel Administrador de Telemetria de Logs do Sistema.
    *   `src/app/settings/page.tsx`: Tela de Gerenciamento de Equipe e Perfil.
    *   `src/components/KanbanBoard.tsx`: Quadro Kanban interativo.
    *   `src/components/LeadDrawer.tsx`: Gaveta lateral de edição completa de leads e tarefas.
    *   `src/lib/api.ts`: SDK do cliente HTTP para chamadas ao backend.

---

## 🗄️ 2. Estrutura do Banco de Dados (`backend/app/db/models.py`)

> **Compatibilidade Cross-Database:** As colunas `status`, `priority` (leads) e `task_type` (tasks) são strings VARCHAR para evitar falhas físicas de tipos ENUM entre SQLite local e PostgreSQL no Render.

### Tabela `users`
*   `id`: UUID (Chave Primária)
*   `email`: String (Único, Indexado)
*   `name`: String
*   `role`: RoleEnum ('admin', 'gestor', 'vendedor')
*   `is_paused`: Boolean (Controle de recebimento no rodízio de leads)
*   `password_hash`: String
*   `team_id`: UUID (Chave Estrangeira ➔ `teams.id`)
*   `created_at` / `updated_at`: DateTime

### Tabela `teams`
*   `id`: UUID (Chave Primária)
*   `name`: String (Único)
*   `manager_id`: UUID (Chave Estrangeira ➔ `users.id`)
*   `created_at`: DateTime

### Tabela `leads`
*   `id`: UUID (Chave Primária)
*   `name` / `email`: String (Não Nulo)
*   `phone` / `company` / `product_interest` / `city_region`: String (Nulável)
*   `source`: String (Origem do lead, e.g. "Site", "WhatsApp", "IMAP")
*   `category`: String (Veículos Novos, Veículos Usados, Locação, Produtos Agregados)
*   `subcategory`: String (Subdivisões exatas do portfólio comercial)
*   `client_type`: String (Autônomo, Frota)
*   `tags`: String (Tags separadas por vírgula)
*   `status`: String (Fluxo: `novo` ➔ `qualificacao` ➔ `distribuido` ➔ `venda_realizada` / `venda_perdida`)
*   `priority`: String (baixa, media, alta, critica)
*   `assigned_to_id`: UUID (Chave Estrangeira ➔ `users.id`)
*   `ai_summary`: Text (Resumo e sugestões de cross-selling)
*   `last_interaction_at`: DateTime (Controle de SLA de atendimento)
*   *Campos de Qualificação Automotiva:* `quantity`, `financial_need`, `purchase_timeline`, `urgency`, `quick_contact_status`, `value_range`, `trade_in_used`, `negotiated_value`, `billing_forecast`, `loss_reason`, `sale_value`, `sale_product`, etc.

### Tabela `tasks`
*   `id`: UUID (Chave Primária)
*   `lead_id`: UUID (Chave Estrangeira ➔ `leads.id`)
*   `assigned_to_id`: UUID (Chave Estrangeira ➔ `users.id`)
*   `title` / `description`: String / Text
*   `due_date`: DateTime
*   `is_completed`: Boolean
*   `task_type`: String ('ligacao', 'email', 'whatsapp', 'reuniao', 'outro')

### Tabela `activities`
*   `id`: UUID (Chave Primária)
*   `lead_id`: UUID (Chave Estrangeira ➔ `leads.id`)
*   `user_id`: UUID (Chave Estrangeira ➔ `users.id`, nulo se gerado pelo sistema)
*   `activity_type`: ActivityTypeEnum ('email_recebido', 'nota_adicionada', 'status_alterado', 'tarefa_concluida', 'alerta_sla', etc.)
*   `content`: Text
*   `created_at`: DateTime

### Tabela `system_logs`
*   `id`: UUID (Chave Primária)
*   `log_type`: String ('INFO', 'WARNING', 'ERROR')
*   `source`: String ('IMAP_READER', 'SLA_CHECKER', 'MIGRATION_PG')
*   `message`: Text
*   `created_at`: DateTime

---

## ⚡ 3. Endpoints da API (`backend/app/api/routes.py`)

*   **Autenticação:**
    *   `POST /api/v1/login`: Valida senha hash e gera JWT token.
    *   `POST /api/v1/reset-password`: Reseta a senha de um usuário específico (apenas administrador).
*   **Leads:**
    *   `GET /api/v1/leads`: Lista leads não arquivados com filtro de status e equipe.
    *   `GET /api/v1/leads/archived`: Lista leads arquivados.
    *   `POST /api/v1/leads`: Criação de lead manual.
    *   `PUT /api/v1/leads/{id}`: Atualização de lead (inclui histórico automático de alterações).
    *   `DELETE /api/v1/leads/{id}`: Exclusão permanente do lead.
    *   `POST /api/v1/leads/{id}/archive`: Arquiva o lead (não visível nas telas normais).
    *   `POST /api/v1/leads/{id}/activities`: Adiciona uma nota/atividade manual na timeline do lead.
*   **Tarefas (Tasks):**
    *   `GET /api/v1/tasks`: Lista tarefas de um vendedor ou equipe.
    *   `POST /api/v1/tasks`: Cria uma nova tarefa vinculada a um lead.
    *   `PUT /api/v1/tasks/{id}`: Atualiza ou marca uma tarefa como concluída.
*   **Usuários & Equipes:**
    *   `GET /api/v1/users`: Lista todos os usuários cadastrados.
    *   `PUT /api/v1/users/{id}/pause`: Pausa/retoma vendedor do rodízio automático de leads.
    *   `GET /api/v1/teams`: Lista todas as equipes comerciais do CRM.
*   **Telemetria (Logs):**
    *   `GET /api/v1/logs`: Retorna registros da tabela `system_logs`.
    *   `POST /api/v1/logs/clear`: Limpa os logs do banco de dados.

---

## 📬 4. Serviços em Background e Fluxo de IA

### Robô IMAP (`backend/app/services/email_reader.py`)
1. Roda em loop contínuo a cada **60 segundos** (`email_listener_loop`).
2. Conecta ao Gmail via IMAP utilizando SSL e credenciais em `EMAIL_USER` e `EMAIL_APP_PASSWORD`.
3. Busca e-mails não lidos.
4. Trata e-mails encaminhados (`ENC:` ou `FWD:`): detecta o remetente original e limpa o cabeçalho do corpo para que a IA analise apenas o conteúdo original do lead.
5. Invoca a contingência tripla de IA (`parse_email_content`).
6. Se a decodificação for bem-sucedida, realiza a distribuição automática:
   * **Rodízio (Round-Robin):** Distribui o lead entre os vendedores ativos (`is_paused == False`) da equipe.
7. Grava o lead no banco de dados, marca o e-mail como lido (`\\Seen`) e gera o log de auditoria correspondente.

### Parser de Contingência Tripla (`backend/app/services/ai_parser.py`)
*   **Groq API (`parse_with_groq`):** Principal provedor de nuvem. Modelo `llama-3.1-8b-instant`.
*   **Gemini API:** Provedor secundário. Modelo `gemini-2.5-flash`.
*   **Fallback Heurístico Local (`fallback_parse_email`):** Baseado em Expressões Regulares (Regex) e regras de busca estática para Nome, Telefone, E-mail, Empresa, Região, Categoria e Subcategoria. Garante resiliência absoluta (0% de perda de leads).

---

## 🖥️ 5. Mapeamento de Telas do Frontend

*   **Agenda / Hoje (`src/app/page.tsx`):** Exibe as tarefas pendentes do dia e cards rápidos de desempenho do vendedor.
*   **Kanban (`src/app/kanban/page.tsx`):** Quadro interativo dividido em colunas (`novo` ➔ `qualificacao` ➔ `distribuido` ➔ `venda_realizada`). Permite mover leads entre etapas via drag-and-drop e disparar a gaveta lateral (`LeadDrawer`) ao clicar no lead.
*   **Histórico / Fechamentos (`src/app/historico/page.tsx`):** Tabela de leads fechados (`venda_realizada` ou `venda_perdida`). Exibe estatísticas de conversão e permite buscar propostas e arquivos anexos vinculados.
*   **Relatórios (`src/app/relatorios/page.tsx`):** Dashboard gerencial com gráficos de taxas de conversão de leads por vendedor, vendas por categoria e motivos de perda.
*   **Automação de Marketing (`src/app/marketing/page.tsx`):** Módulo de simulação (Beta) de envios automatizados de campanhas por e-mail e SMS para leads cadastrados.
*   **Visualizador de Logs (`src/app/logs/page.tsx`):** Tela administrativa que permite visualizar as atividades do robô de e-mails em tempo real.
