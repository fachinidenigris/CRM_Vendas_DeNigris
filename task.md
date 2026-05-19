# Controle de Tarefas (task.md)

Este arquivo registra e rastreia o andamento de todas as tarefas comerciais e técnicas solicitadas para o CRM Vendas DeNigris.

---

## 📋 Lista de Tarefas (Histórico & Andamento)

| ID | Tarefa | Status | Data de Início | Data de Fim | Observações |
| :--- | :--- | :---: | :---: | :---: | :--- |
| 1 | Estabilizar Compilação do Frontend (Vercel Build) | ✅ Concluído | 18/05/2026 | 18/05/2026 | Removidos erros de compilação estrita em icons Lucide, tipos e duplicidade de `city_region`. |
| 2 | Ingestão IMAP Transacional Resiliente | ✅ Concluído | 18/05/2026 | 18/05/2026 | Implementado BODY.PEEK[] e Seen tardio em `email_reader.py` com telemetria robusta. |
| 3 | Consistência de Funil Simplificado e SLA | ✅ Concluído | 18/05/2026 | 18/05/2026 | Ajustada a rotina do SLA para englobar os novos status de funil (`novo`, `distribuido`). |
| 4 | Blindagem de Rotas JWT & Isolamento SQL (RLS) | ✅ Concluído | 18/05/2026 | 18/05/2026 | Enforced JWT no backend com filtros automáticos por perfil comercial e centralizado no securedFetch. |
| 5 | Kanban Touch Mobile & Notificações Toast | ✅ Concluído | 18/05/2026 | 18/05/2026 | Adicionado menu dropdown touch em cards Kanban e linda biblioteca nativa de Toasts. |
| 6 | Deploy e Sincronização de Repositório Git | ✅ Concluído | 18/05/2026 | 18/05/2026 | Pushed commit `b534206` com sucesso para o GitHub. |
| 7 | Migração e Alinhamento de Leads do Kanban | ✅ Concluído | 18/05/2026 | 18/05/2026 | Criadas colunas ausentes no banco SQLite (`is_archived`, etc.) e migrados status legados para exibição imediata no funil. |
| 8 | Tela Agenda/Hoje: Visão Calendário | ✅ Concluído | 18/05/2026 | 18/05/2026 | Implementado planejador de produtividade diária navegável (horizontal week strip + datepicker). |
| 9 | Coluna de Tarefas Feitas na Agenda | ✅ Concluído | 18/05/2026 | 18/05/2026 | Adicionado layout responsivo de 4 colunas com seção de tarefas concluídas por data para auditoria do gestor. |
| 10 | Kanban: Correção do Scroll Lateral | ✅ Concluído | 18/05/2026 | 18/05/2026 | Corrigido scroll lateral do Kanban aplicando h-[calc(100vh-190px)] no board e rolagem independente h-full/overflow-y nas colunas. |
| 11 | Histórico/Arquivos: Filtro de Período | ✅ Concluído | 18/05/2026 | 18/05/2026 | Adicionado seletor e filtro de período (Hoje, Esta Semana, Este Mês) no Histórico de Fechamentos. |
| 12 | Telas de Relatórios (Analytics) & Marketing | ✅ Concluído | 18/05/2026 | 18/05/2026 | Criadas as novas telas e implementada a integração completa dos módulos de Relatórios Comerciais e Automação de Marketing com a barra de navegação principal. |
| 13 | Automação de Marketing: Aviso Beta | ✅ Concluído | 18/05/2026 | 18/05/2026 | Adicionado banner visual informativo destacando o caráter simulado do módulo de marketing. |
| 14 | Correção de Salvamento Manual de Leads (PostgreSQL) | ✅ Concluído | 18/05/2026 | 18/05/2026 | Resolvido o erro no PostgreSQL de produção que impedia salvamento de novos leads. |
| 15 | Correção no Processador de E-mails IMAP | ✅ Concluído | 18/05/2026 | 18/05/2026 | Criada rotina de auto-migração de enums (leadstatusenum) no banco de dados para sincronização do fluxo. |
| 16 | Correção Definitiva do ENUM PostgreSQL (Produção Render) | ✅ Concluído | 18/05/2026 | 18/05/2026 | Migradas colunas `leads.status`, `leads.priority` e `tasks.task_type` de `SQLEnum` (tipo físico PG) para `Column(String)`. Migração DDL automática via `ALTER COLUMN TYPE VARCHAR` executa no boot do backend. |
| 17 | Correção do Crash no Boot (CORS bloqueado / Kanban vazio) | ✅ Concluído | 19/05/2026 | 19/05/2026 | Reescrito `main.py` com migração em 3 blocos 100% resilientes — nenhum bloco pode crashar o processo. O CORS estava sendo bloqueado porque o servidor caía antes de registrar o middleware. |
| 18 | Suporte a E-mails Encaminhados (ENC:/FWD:) no IMAP | ✅ Concluído | 19/05/2026 | 19/05/2026 | Adicionado filtro de assunto para `ENC:/FWD:` + extração automática do corpo real de e-mails encaminhados antes de enviar ao Gemini para parsing. |
| 19 | Correção do Default de ENUM no PostgreSQL (Físico) | ✅ Concluído | 19/05/2026 | 19/05/2026 | Corrigida a função `migrate_col_to_varchar` no `main.py` para executar `DROP DEFAULT` antes da conversão e `SET DEFAULT` depois no PostgreSQL, removendo bloqueios do banco. |
| 20 | Parser de Contingência Local (Fallback do Gemini) | ✅ Concluído | 19/05/2026 | 19/05/2026 | Desenvolvido extrator heurístico local via regex em `ai_parser.py` para capturar leads caso a API do Gemini falhe por exaustão de cota de créditos. |
| 21 | Integração da Groq API com Contingência Tripla | ✅ Concluído | 19/05/2026 | 19/05/2026 | Adicionado suporte a `GROQ_API_KEY` (Pydantic / .env). Implementada lógica em `ai_parser.py`: tenta primeiro Groq (Llama 3.1 8B), depois Gemini (2.5 Flash), e por fim Fallback Heurístico Local. Testado com sucesso localmente. |
