# Protocolo de Habilidade de Desenvolvimento Baseado em Tasks

Este protocolo define a habilidade operacional obrigatória para a execução de tarefas no projeto **CRM Vendas DeNigris**. Toda interação e desenvolvimento devem seguir rigorosamente o ciclo de vida estruturado abaixo.

---

## 🌀 Ciclo de Vida do Desenvolvimento (Passo a Passo)

```mermaid
graph TD
    A[Receber Demanda do Usuário] --> B[Registrar ou Atualizar task.md]
    B --> C[Análise de Código & Plano Técnico]
    C --> D[Execução Focada da Tarefa]
    D --> E[Revisão e Double-Check de Inconsistências]
    E --> F[Atualizar Status no task.md]
    F --> G[Apresentar Resultado & Prosseguir]
```

---

## 🛠️ Detalhamento das Etapas

### 1. Registro de Demanda (Tasking)
*   **Ação:** Logo após o recebimento de qualquer instrução, bug report ou nova feature solicitada pelo usuário, a IA deve registrar ou atualizar o arquivo `task.md` na raiz do projeto.
*   **Regra Rígida:** Nenhuma linha de código de produção deve ser alterada antes da atualização do `task.md`.

### 2. Análise de Código e Plano Técnico (Zero Regressão)
*   **Ação:** Analisar detalhadamente o código atual e criar um plano de implementação.
*   **Foco:** Garantir que a alteração seja feita de forma limpa, de acordo com as regras de negócio pré-existentes, sem causar regressões funcionais ou quebrar compilações.

### 3. Execução Focada
*   **Ação:** Aplicar as alterações técnicas no código seguindo as melhores práticas (tipagem TypeScript estrita, segurança FastAPI, tratamento de erros robusto).

### 4. Code Review & Double-Check
*   **Ação:** Após a execução, realizar uma varredura crítica no código modificado.
*   **Foco:** Procurar por loops ineficientes, try-catch silenciosos, tipagens inconsistentes ou imports ausentes.

### 5. Atualização de Progresso
*   **Ação:** Atualizar o arquivo `task.md`, marcando a tarefa concluída com a data e observações técnicas relevantes antes de seguir para o próximo item.
