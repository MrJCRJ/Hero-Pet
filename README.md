# Hero-Pet

Sistema de gestão (Entidades, Produtos e Estoque) em Next.js + Node.js com TailwindCSS e Jest. O backend expõe rotas versionadas em `pages/api/v1/*` e usa Postgres via Docker e migrações em `infra/migrations/`.

## Sumário rápido

- Frontend: Next.js + Tailwind
- Backend: API Routes (`pages/api/v1`) com Postgres
- Infra: Docker Compose (Postgres 16) porta host 5433
- Testes: Jest com servidor Next iniciado em `globalSetup`

## Como rodar

1. Instalar deps

```bash
npm install
```

2. Configurar `.env.development` (exemplo mínimo)

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=hero_pet
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hero_pet
```

3. Subir Postgres (opcional em dev, os testes sobem/param automaticamente)

```bash
docker compose -f infra/compose.yaml up -d
```

4. Rodar app em dev

```bash
npm run dev
```

5. Aplicar migrações (manual)

```bash
curl -X POST http://localhost:3000/api/v1/migrations
```

6. Rodar testes

```bash
npm test
```

## Endpoints principais

### Status e Migrações

- GET `/api/v1/status` — healthcheck.
- POST `/api/v1/migrations` — aplica migrações pendentes; idempotente.

### Entidades (clientes/fornecedores)

- GET `/api/v1/entities` — lista com filtros (status, pending etc.).
- POST `/api/v1/entities` — cria; normaliza e classifica documento no servidor.
- PUT `/api/v1/entities/:id`, DELETE `/api/v1/entities/:id` — atualizar/inativar.
- GET `/api/v1/entities/summary` — agregados e percentuais de completude.

Regras de documento, máscaras e validação agrupadas em `components/entity/utils.js` e compartilhadas na API.

### Produtos

- POST `/api/v1/produtos` — cria produto; valida fornecedor (somente PJ) e `codigo_barras` único (parcial: apenas quando não nulo).
- GET `/api/v1/produtos` — filtros `q`, `categoria`, `codigo_barras`, `ativo`; paginação `limit` (<=500) e `offset`. Quando `meta=1`, retorna `{ data, meta: { total } }`.
- PUT `/api/v1/produtos/:id` — atualização parcial; validações de `fornecedor_id` (PJ) e `codigo_barras` único.
- DELETE `/api/v1/produtos/:id` — soft delete (`ativo=false`).

Campos: `nome` (obrigatório), `descricao`, `codigo_barras`, `categoria`, `fornecedor_id`, `preco_tabela`, `markup_percent_default`, `estoque_minimo`, `ativo`.

### Estoque

- POST `/api/v1/estoque/movimentos` — cria movimento: `tipo` em `ENTRADA|SAIDA|AJUSTE`.
  - ENTRADA: requer `valor_unitario`; calcula `valor_total = quantidade*valor_unitario + frete + outras_despesas`.
  - SAIDA/AJUSTE: ignoram custo (armazenado como `null`), `frete/outras_despesas=0`.
- GET `/api/v1/estoque/movimentos` — lista por `produto_id` obrigatório; filtros `tipo`, `from`, `to`; paginação `limit` (<=200) e `offset`. Quando `meta=1`, retorna `{ data, meta: { total } }`.
- GET `/api/v1/estoque/saldos` — retorna `{ produto_id, saldo, custo_medio, ultimo_custo }` calculados sob demanda.

Schema relevante em `infra/migrations`:

- `1758200000000_create_produtos_table.js`
- `1758201000000_create_movimento_estoque_table.js`

## Estrutura do projeto

- `components/` — UI (inclui `components/entities/*` com fluxo refatorado PF/PJ)
- `hooks/` — Hooks (ex.: `usePaginatedEntities`, `useStatus`, `useAuth`)
- `infra/` — Docker, DB e migrações (porta 5433 mapeada no host)
- `lib/` — Utilidades (erros, validações compartilhadas em `lib/validation/*`)
- `pages/` — Next pages e API routes (`pages/api/v1/*`)
- `tests/` — Jest (UI e API), com servidor Next inicializado uma vez (`globalSetup`)

## Padrões de testes

- Os testes de API sobem o Postgres (via compose) e iniciam um servidor Next único.
- Migrações são aplicadas automaticamente chamando `POST /api/v1/migrations` no setup.
- Exemplos recentes:
  - Produtos: `tests/api/v1/produtos/post.test.js`, `get.test.js`, `put-delete.test.js`, `pagination-meta.test.js`.
  - Estoque: `tests/api/v1/estoque/movimentos-and-saldos.test.js`, `get-movimentos.test.js`, `get-movimentos-filters.test.js`.

Para rodar somente um conjunto:

```bash
npm test -- tests/api/v1/produtos/pagination-meta.test.js
```

## Troubleshooting

- Porta do Postgres em uso (5432): o compose usa host 5433. Confirme `.env.development` e `infra/compose.yaml`.
- Erros 503 (schema): rode `POST /api/v1/migrations` antes de usar novos endpoints/colunas.
- Conflito de `codigo_barras`: a API retorna 409 quando duplicado (parcial único quando não nulo).
- Flakiness nos testes: confie no `globalSetup` que inicia apenas um servidor Next para toda a suíte.

## Licença

MIT

## Seed de Demonstração

Para popular dados rapidamente e facilitar a análise da aplicação, há um seed de demo:

1. Inicie o servidor: `npm run dev`
2. Em outro terminal, rode: `npm run seed:demo`

O seed cria:

- 1 fornecedor (PJ) e 2 clientes (PF)
- 3 produtos
- 1 pedido de COMPRA confirmado (abastece estoque)
- 1 pedido de VENDA confirmado
- 1 pedido de VENDA em rascunho

Configuração opcional:

- `SEED_BASE_URL`: URL base da API (padrão `http://localhost:3000`). Ex.: `SEED_BASE_URL=http://127.0.0.1:3000 npm run seed:demo`

## Migrações: Auto-apply e Runbook

Por padrão, as migrações devem ser aplicadas explicitamente via endpoint de migrações no deploy. Há um fallback opcional de auto-aplicação em runtime que pode ser habilitado por env.

- MIGRATIONS_AUTO_APPLY (opcional)
  - Valores aceitos para habilitar: `1`, `true` (case-insensitive)
  - Comportamento: ao detectar `42P01` (tabela/relacionamento ausente), a API tenta aplicar as migrações (node-pg-migrate) e reexecuta a operação UMA vez.
  - Observações: pode aumentar a latência da primeira requisição; requer permissões DDL no banco. Concor­rência é protegida por um lock em memória por processo.

Runbook recomendado (produção):

1. Antes de ativar o novo build, aplique migrações:
   - `POST /api/v1/migrations` (idempotente; retorna 201 se migrou algo, 200 se nada pendente)
2. Após migrações OK, publique o build.
3. (Opcional) Healthcheck/readiness com `GET /api/v1/migrations` para validar ausência de pendências.

Quando considerar habilitar MIGRATIONS_AUTO_APPLY:

- Ambientes dinâmicos/efêmeros (ex.: pré-visualização) ou cenários onde o orchestrator pode inicializar instâncias antes da etapa de migração.
- Lembre-se de manter desabilitado em produção caso sua política exija migrações controladas e auditáveis.

## Autenticação Administrativa (Codes via ENV)

O painel administrativo utiliza hoje um mecanismo simples de códigos compartilhados (client-side) mapeando código -> nome de usuário. Para evitar hardcode no bundle, é possível definir a variável de ambiente `NEXT_PUBLIC_ADMIN_CODES`.

### Formatos Aceitos

`NEXT_PUBLIC_ADMIN_CODES` deve ser uma string JSON em um destes formatos:

1. Objeto chave->valor (string ou objeto com name):

```env
NEXT_PUBLIC_ADMIN_CODES='{"hero123":"Icaro","admin":"Jose"}'
```

Ou:

```env
NEXT_PUBLIC_ADMIN_CODES='{"hero123":{"name":"Icaro"},"admin":{"name":"Jose"}}'
```

2. Array de objetos `{ code, name }`:

```env
NEXT_PUBLIC_ADMIN_CODES='[{"code":"hero123","name":"Icaro"},{"code":"admin","name":"Jose"}]'
```

### Fallback

Se a variável não estiver definida ou o JSON for inválido, cai no fallback interno:

```js
{ hero123: { name: "Icaro" }, admin: { name: "Jose" } }
```

### Armazenamento Local

- Ao autenticar, salva em `localStorage` as chaves:
  - `adminAuthenticated` = "true"
  - `adminAuthenticatedUser` = nome associado
- Versões anteriores que só tinham `adminAuthenticated` sem o nome recebem fallback "Admin" (e persistem o nome).

### Segurança / Limitações

- Trata-se de proteção leve (obfuscation). O código fica acessível ao usuário (exposto no build ou no env público) — não usar para dados realmente sensíveis.
- Para elevação real de privilégio, migrar futuramente para fluxo server-side (ex: endpoint de login + JWT + roles) e mover a lista de usuários/códigos para o backend.

### Boas Práticas

- Rotacionar códigos periodicamente (atualizando a env e redeploy).
- Evitar reutilizar códigos triviais ("123", "admin").
- Usar nomes de usuário consistentes para auditoria em logs (ex.: salvar user ao registrar movimentos/alterações futuras).

### Exemplo Completo `.env.development`

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=hero_pet
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hero_pet
NEXT_PUBLIC_ADMIN_CODES='{"hero123":"Icaro","admin":"Jose"}'
```

### Próxima Evolução Sugerida

1. Adicionar expiração de sessão (timestamp em localStorage e revalidação após X horas).
2. Persistir logs com o campo `usuario` (já existe em movimentos de estoque; reutilizar para outras ações administrativas).
3. Migrar estrutura para autenticação server-driven se requisitos de segurança crescerem.
