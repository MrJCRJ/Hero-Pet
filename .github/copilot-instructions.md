## Hero-Pet – Instruções Rápidas para Agentes

Foco: produtividade imediata em um monorepo Next.js (frontend + API Routes) com Postgres, migrações manuais via endpoint e testes de integração predominantes.

### Estrutura Essencial

- `pages/api/v1/*`: Limite de serviço. Cada subpasta = domínio (status, migrations, produtos, estoque, pedidos, entities).
- `infra/migrations/`: Fonte de verdade do schema (aplicar via `POST /api/v1/migrations`).
- `components/`: UI modular por domínio (`orders/`, `products/`, `entities/`, `entity/` refatorado PF/PJ).
- `hooks/`: Abstrações reutilizáveis (`usePaginatedResource`, `useHighlightEntityLoad`, auth, status).
- `lib/validation/patterns.js`: Regex/fragmentos SQL centralizados (evitar duplicar email/telefone em endpoints ou queries).

### Fluxos de Desenvolvimento

1. Dev: `npm run dev` (não subir manualmente em testes). Postgres via compose porta host 5433.
2. Migrações: sempre antes de novos campos/índices → `POST /api/v1/migrations`; 503 com dica = schema desatualizado.
3. Testes: `npm test` usa `globalSetup` (um único servidor). Nunca iniciar `next dev` dentro dos testes.
4. Rodar subset: `npm test -- tests/api/v1/produtos/pagination-meta.test.js`.

### Padrões Críticos

- Paginação: endpoints suportam `limit` + `offset` e quando `meta=1` retornam `{ data, meta: { total } }`. Hooks (`usePaginatedResource`) fazem fallback se backend retornar array simples.
- Deep-link edição: query `?highlight=<id>` + `useHighlightEntityLoad` abre modal/form diretamente sem quebrar lista.
- Entidades (PF/PJ) & documentos: lógica de máscara/validação em `components/entity/utils.js`; backend reutiliza (import) para classificar `pending|provisional|valid` e nunca confia em status vindo do front.
- Produtos: validação de `codigo_barras` (único quando não nulo) e fornecedor PJ. Hard delete possui fluxo separado (ConfirmDialog + senha).
- Estoque: movimentos (`ENTRADA|SAIDA|AJUSTE`); custo só em ENTRADA; saldos calculados on-demand. FIFO extensão: estados `legacy|eligible|fifo` (ver testes `fifo-debug-and-migration`).

### Convenções de Teste

- API tests usam header `@jest-environment node` quando necessário para evitar jsdom.
- UI integrações simulam blur/tab para disparar classificação (evita warnings de act). Ex.: `DocumentStatus.integration.test.js`.
- Novo endpoint → criar pasta espelhada em `tests/api/v1/<nome>`; incluir caso de filtro inválido (esperar 400) e caso meta.

### Migração / Schema Drift

- Erros Postgres `42P01` / `42703` => orientar a chamar migrações; não silenciar.
- Nova coluna: migração idempotente + teste cobrindo criação/filtro antes de usar amplamente em UI.

### Evitar Armadilhas

- NÃO duplicar regex telefone/email: sempre importar de `lib/validation/patterns.js`.
- NÃO recalcular status documento ad-hoc: usar `classifyDocument` compartilhado.
- NÃO iniciar múltiplos servidores em testes (causa EADDRINUSE) — confiar no setup global.
- NÃO aplicar máscara destrutiva em `onChange` (funções de formatação já são idempotentes e toleram parcial).

### Alterações em Paginação

Se backend mudar forma de resposta, atualizar parser em `usePaginatedResource` (não replicar lógica em cada Manager). Garantir fallback legado.

### FIFO (Resumo Operacional)

Pedidos VENDA: começam `legacy`; quando cobertura total de lotes → `eligible`; job/PUT com `migrar_fifo` gera pivots e vira `fifo`. Teste referência: `tests/api/v1/pedidos/fifo-debug-and-migration.test.js`.

### Checklist Antes de Commit Significativo

1. Reutilizou util/core existente (sem copiar regex ou lógica de status)?
2. Adicionou teste cobrindo caminho feliz + filtro inválido / estado parcial?
3. Rodou `POST /api/v1/migrations` após criar/alterar migração e testes passam?
4. Novo hook ou pattern documentado (README de módulo ou este arquivo)?
5. Nenhum warning de act() ou portas em uso na suíte.

Mantenha foco em reutilização + consistência de padrões; isso preserva previsibilidade e velocidade futura.
