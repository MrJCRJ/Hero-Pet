# Refinamentos pós-fases

Documentação dos refinamentos implementados após as 6 fases do Hero-Pet.

## Segurança e consistência

- **Validação de estoque negativo**: Transação com lock (`FOR UPDATE`) na movimentação legacy para evitar race condition.
- **Roles nas APIs**: Helper `withRole` aplicado em todas as rotas `/api/v1/*`. GET: qualquer autenticado; POST/PUT: admin ou operador; DELETE: admin.
- **Setup inicial**: Página `/setup` para criar o primeiro admin. Migração não insere mais usuário padrão.

## Auditoria

- **withAudit**: Wrapper que registra ações críticas em `log` (exclusão de pedidos, entities, movimentações, baixa de promissórias, despesas).

## Correções

- **Fluxo de caixa**: Entradas = vendas à vista (`parcelado = false`) + promissórias recebidas. Evita dupla contagem.

## Funcionalidades

- **Exportação relatórios**: `?format=json|pdf|xlsx` em DRE, fluxo-caixa, margem-produto, ranking.
- **Histórico de movimentações**: Seção na página de estoque com paginação.
- **NF-e teste**: `NFE_PROVIDER=test` simula emissão bem-sucedida.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| AUTH_SECRET | Chave para JWT (NextAuth). Obrigatória. |
| NFE_PROVIDER | `test` para simulação; ou provedor real (NFe.io, etc.) |
| NFE_API_TOKEN | Token da API do provedor (produção) |
| NFE_TEST_FAIL | `1` para simular falha no provider de teste |
