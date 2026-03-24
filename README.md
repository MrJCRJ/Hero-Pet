# Hero-Pet

<p align="left">
  <img alt="Act Warnings" src="https://github.com/MrJCRJ/Hero-Pet/actions/workflows/act-warnings.yml/badge.svg" />
</p>

## Sobre o Projeto

**Hero-Pet** é um sistema de gestão empresarial para análise de dados de uma pet shop, desenvolvido em stack moderna. O sistema permite gerenciar **Entidades** (clientes e fornecedores), **Produtos**, **Pedidos** (compras e vendas), **Estoque** (com FIFO) e **Despesas**, além de dashboards com métricas, gráficos de evolução e controle de promissórias.

- **Frontend**: Next.js 15, React 19, TailwindCSS 4, Framer Motion
- **Backend**: API Routes versionadas em `pages/api/v1/*`, PostgreSQL
- **Infra**: Docker Compose (Postgres 16), migrações com node-pg-migrate
- **Testes**: Jest, Testing Library, CI com verificação de warnings de `act()`

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
AUTH_SECRET=uma-chave-secreta-aleatoria-min-32-chars
# Para testes de NF-e: NFE_PROVIDER=test (simula emissão)
# NFE_PROVIDER=test
```

3. Subir Postgres (opcional em dev, os testes sobem/param automaticamente)

```bash
docker compose -f infra/compose.yaml up -d
```

4. Rodar app em dev

```bash
npm run dev
```

**Sem Docker** (Postgres em outro host ou ambiente):

```bash
npm run dev:standalone
```

5. Aplicar migrações e criar usuário

```bash
# Aplicar migrações
curl -X POST http://localhost:3000/api/v1/migrations
# Na primeira execução, acesse /setup para criar o administrador inicial
```

6. Rodar testes

**IMPORTANTE:** Os testes fazem `DROP SCHEMA` e **apagam todos os dados** do banco. Use um banco **separado** para testes:

```bash
cp .env.test.sample .env.test
# Edite .env.test: POSTGRES_DB=hero_pet_test (ou neondb_test no Neon)
npm test
```

Com Neon/cloud: crie um banco de testes e configure em `.env.test`. O Jest bloqueia execução em banco de produção.

### Configuração para Produção

Para conectar ao banco de dados em produção:

1. **Configure as variáveis de ambiente** em `.env.production`:

```env
POSTGRES_HOST=seu-host-de-producao.com
POSTGRES_PORT=5432
POSTGRES_USER=seu_usuario_producao
POSTGRES_PASSWORD=sua_senha_producao
POSTGRES_DB=nome_do_banco_producao
DATABASE_URL=postgresql://usuario:senha@host:porta/banco?sslmode=require
MIGRATIONS_AUTO_APPLY=1
AUTH_SECRET=uma-chave-secreta-aleatoria-min-32-chars  # obrigatório para NextAuth
```

**Importante:** `AUTH_SECRET` é **obrigatório** para o NextAuth funcionar. Sem ele, `/api/auth/*` retorna 500 (MissingSecret). Gere um valor seguro com: `npx auth secret` ou `openssl rand -base64 32`.

### Variáveis de ambiente (relatórios consolidado)

O relatório consolidado em JSON inclui um **cenário de liquidação** que usa:

| Variável                    | Descrição                                      | Exemplo      | Default |
|-----------------------------|------------------------------------------------|--------------|---------|
| `SALDO_DEVOLVER_SOCIOS`     | Valor em reais a devolver aos sócios (liquidação). Se não definido, calculado automaticamente (aportes − devoluções de capital) | `13925.09`   | calculado |
| `COMISSAO_LIQUIDACAO_PCT`   | Percentual de comissão sobre venda do estoque  | `6`          | `6`     |

Para testes ou situações em que o valor não esteja fixo em ambiente, use o parâmetro de requisição:

```
GET /api/v1/relatorios/consolidado?mes=3&ano=2025&saldoSocios=13925.09
```

O parâmetro `?saldoSocios=` sobrescreve `SALDO_DEVOLVER_SOCIOS` apenas naquela requisição.

### Deploy na Vercel

Na Vercel, configure as **Environment Variables** em **Project Settings → Environment Variables**:

| Variável       | Obrigatório | Descrição                                                  |
|----------------|-------------|------------------------------------------------------------|
| `AUTH_SECRET`  | Sim         | Chave secreta para JWT/sessão. Gere com `npx auth secret` |
| `DATABASE_URL` | Sim         | URL de conexão PostgreSQL (ex.: Neon, Supabase)           |
| `POSTGRES_*`   | Sim*        | Alternativa ao DATABASE_URL: HOST, PORT, USER, PASSWORD, DB |

\* Use `DATABASE_URL` ou as variáveis `POSTGRES_*` individualmente.

Após adicionar `AUTH_SECRET`, faça um novo deploy (ou **Redeploy** no painel da Vercel).

**Migrations automáticas:** Se `POSTGRES_HOST` contiver `neon.tech`, as migrations automáticas são desabilitadas (para evitar overhead em bancos remotos como Neon). Use `MIGRATIONS_AUTO_APPLY=0` ou conecte a um host Neon para pular o auto-apply.

2. **Teste a conexão** com o banco de produção:

```bash
npm run test:prod-connection
```

3. **Aplique as migrações** no banco de produção:

```bash
npm run migration:up:prod
```

4. **Execute a aplicação** em modo produção:

```bash
npm run build
npm start
```

**Nota:** Certifique-se de que o banco de produção permite conexões SSL (recomendado para segurança).

### Testes em CI / Ambientes sem login no Docker

- Se o pull do Postgres no Docker Hub exigir autenticação (erro "unauthorized: authentication required"), há três opções:
  1. Faça login e faça o pull previamente: `docker login && docker pull postgres:16.10-alpine3.22`
  2. Use o espelho público (já padrão no compose): `public.ecr.aws/docker/library/postgres:16-alpine` (ou defina `POSTGRES_IMAGE`)
  3. Rode sem subir Docker (quando o Postgres já existe):

```bash
npm run test:ci
```

Veja `.env.ci.sample` para variáveis mínimas de conexão.

## Endpoints principais

### Relatórios

- GET `/api/v1/relatorios/consolidado?mes=&ano=&format=json` — relatório consolidado em JSON (DRE, fluxo, indicadores, margem, ranking, cenário de liquidação). Suporta `?saldoSocios=` para sobrescrever saldo a devolver aos sócios. PDF/Excel descontinuados (usar consolidado JSON).
- GET `/api/v1/relatorios/dre`, `/fluxo-caixa`, `/margem-produto`, `/ranking` — retornam JSON. Formatos PDF/Excel retornam 400 com indicação de depreciação.

### Status e Migrações

- GET `/api/v1/status` — healthcheck.
- POST `/api/v1/migrations` — aplica migrações pendentes; idempotente.

### Entidades (clientes/fornecedores)

- GET `/api/v1/entities` — lista com filtros (status, pending etc.).
- POST `/api/v1/entities` — cria; normaliza e classifica documento no servidor.
- PUT `/api/v1/entities/:id`, DELETE `/api/v1/entities/:id` — atualizar/inativar.
- GET `/api/v1/entities/summary` — agregados e percentuais de completude.

Regras de documento, máscaras e validação agrupadas em `components/entity/utils.js` e compartilhadas na API.

### Usuários (apenas admin)

- GET `/api/v1/users` — lista usuários (role admin).
- POST `/api/v1/users` — cria usuário (`nome`, `email`, `senha`, `role`).
- GET `/api/v1/users/:id` — detalhe.
- PUT `/api/v1/users/:id` — atualiza (`nome`, `email`, `senha?`, `role`, `must_change_password`).
- DELETE `/api/v1/users/:id` — exclui.

A interface administrativa está em `/admin/usuarios` (link visível apenas para usuários com role admin).

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

## Documentação Adicional

- [`docs/pedido-controller-split.md`](docs/pedido-controller-split.md) — Arquitetura do split do controller de pedido em hooks especializados
- [`components/pedidos/README.md`](components/pedidos/README.md) — Módulo unificado de pedidos (dashboard + formulário)
- [`components/pedidos/orders/README.md`](components/pedidos/orders/README.md) — Componentes do dashboard e refatoração Orders
- [`tests/README.md`](tests/README.md) — Guia de testes (renderAndFlush, act warnings)

## Estrutura do projeto

- `app/` — App Router (layout, página inicial) — em migração para Next.js 15
- `components/` — UI por domínio (entities, pedidos, products, despesas, etc.)
- `hooks/` — Hooks globais (`usePaginatedEntities`, `useStatus`, `useAuth`)
- `contexts/` — Contextos React (ThemeContext, etc.)
- `infra/` — Docker, DB e migrações (porta 5433 mapeada no host)
- `lib/` — Utilidades (erros, validações em `lib/validation/*`)
- `pages/` — API routes (`pages/api/v1/*`), `_app` e fallbacks durante migração
- `tests/` — Jest (UI e API), servidor Next em `globalSetup`

Path aliases: `@/components`, `@/hooks`, `@/lib`, `@/contexts`. Ver [docs/MIGRATION_APP_ROUTER.md](docs/MIGRATION_APP_ROUTER.md) para o plano de migração.

## Padrões de testes

- Os testes de API sobem o Postgres (via compose) e iniciam um servidor Next único.
- Migrações são aplicadas automaticamente chamando `POST /api/v1/migrations` no setup.
- Exemplos recentes:
  - Produtos: `tests/api/v1/produtos/post.test.js`, `get.test.js`, `put-delete.test.js`, `pagination-meta.test.js`.
  - Estoque: `tests/api/v1/estoque/movimentos-and-saldos.test.js`, `get-movimentos.test.js`, `get-movimentos-filters.test.js`.

### renderAndFlush (UI com efeitos em cadeia)

Para componentes que disparam sequência de efeitos (ex: `fetch -> setState(data) -> setLoading(false)`), usamos o helper `tests/test-utils/renderAndFlush.js`.

Motivação:

- Eliminar flakiness baseada em `setTimeout` arbitrário.
- Garantir que warnings de `act()` sejam capturados e (em modo estrito `ACT_STRICT=1`) quebrem o teste.

Uso básico:

```js
import renderAndFlush from "tests/test-utils/renderAndFlush";

test("exemplo", async () => {
  await renderAndFlush(<MeuComponente />); // 2 ciclos padrão
});
```

Quando há mais efeitos encadeados (ex: dashboards), aumente ciclos:

```js
await renderAndFlush(<Dashboard />, { cycles: 3 });
```

Aplicado recentemente a: `OrdersRow`, `OrdersDashboard`, `InfoModal`, `PromissoriasList`, `PromissoriasDots`, `PayPromissoriaModal`.

Scripts úteis:

- `npm run test:act-debug` – mostra warnings de `act()`.
- `npm run test:act-strict` – falha se houver qualquer warning.

Workflow `act-warnings` em CI roda ambos (badge no topo indica status). Documentação complementar em `tests/README.md`.

### Guia de Estilo / Padronização

Políticas de tamanho e modularização:

- Componentes > 350 linhas: falha em `npm run lint:components` (extraia subcomponentes / hook de lógica).
- Hooks > 400 linhas: falha em `npm run lint:hooks` (dividir em sub-hooks focados). Exceção temporária: comentar `// hooks-lint: allow-large (motivo)` nas 5 primeiras linhas.
- Forms complexos seguem padrão Hook + Seções (ex.: ProductForm, PedidoForm refatorado).

Refactors estruturais em andamento / plano:

- Split do controller de pedido documentado em [`docs/pedido-controller-split.md`](docs/pedido-controller-split.md) (divide em: usePedidoTipoParceiro, usePedidoItens, usePedidoPromissorias, usePedidoTotals, usePedidoSideEffects...).

Checklist antes de criar/alterar grande bloco:

1. Existe util/hook reutilizável já pronto? Reutilize antes de reimplementar.
2. Tamanho após mudança permanece abaixo dos limites? Caso contrário, extraia.
3. Adicionou testes (feliz + edge principal)?
4. Removido código morto / duplicado?
5. Rodou `lint:components`, `lint:hooks` e suite relevante de testes.

Para rodar somente um conjunto:

```bash
npm test -- tests/api/v1/produtos/pagination-meta.test.js
```

## Troubleshooting

- Porta do Postgres em uso (5432): o compose usa host 5433. Confirme `.env.development` e `infra/compose.yaml`.
- Erros 503 (schema): rode `POST /api/v1/migrations` antes de usar novos endpoints/colunas.
- Conflito de `codigo_barras`: a API retorna 409 quando duplicado (parcial único quando não nulo).
- Flakiness nos testes: confie no `globalSetup` que inicia apenas um servidor Next para toda a suíte.

## Versão para Portfólio

Para uma descrição resumida e adequada a portfólio, consulte [`PORTFOLIO.md`](PORTFOLIO.md).

## Licença

MIT

## Seed de Demonstração

Script: `scripts/seed-demo-data.js` (comando `npm run seed:demo`). Ele cria fornecedores, clientes, produtos, pedidos de COMPRA (gerando lotes FIFO) e pedidos de VENDA (consumindo FIFO) usando SOMENTE a API HTTP (respeita validações e lógica de custo).

### Uso Básico

1. Suba o servidor em outro terminal:

```bash
npm run dev
```

2. Execute o seed (valores default razoáveis):

```bash
npm run seed:demo
```

### Parâmetros (CLI)

Todos opcionais; padrão entre parênteses.

```
--clientes N        (15)
--fornecedores N    (5)
--produtos N        (25)
--compras N         (20)  # pedidos tipo COMPRA
--vendas N          (40)  # pedidos tipo VENDA
--host URL          (http://localhost:3000) ou env SEED_BASE_URL
--seed NUM          (torna pseudo-determinístico)
--no-wait           (não aguarda readiness /api/v1/status)
--months N          (distribui data_emissao de compras/vendas ao longo dos últimos N meses)
```

Exemplo customizado enxuto:

```bash
node scripts/seed-demo-data.js --clientes 4 --fornecedores 2 --produtos 8 --compras 5 --vendas 10 --seed 42
```

Ou via npm script (aceita flags após `--`):

```bash
npm run seed:demo -- --produtos 10 --compras 5 --vendas 12
```

### Variáveis de Ambiente

- `SEED_BASE_URL` substitui `--host` se definido.

### Estratégia Interna

Ordem: Fornecedores (PJ) -> Clientes (PF) -> Produtos -> Pedidos COMPRA -> Pedidos VENDA.

Quando `--months N` (N > 1):

- Cada pedido recebe `data_emissao` retroativa distribuída linearmente do mês atual até N-1 meses atrás.
- Dia dentro do mês escolhido aleatoriamente (1..28) para evitar meses curtos.
- Permite gerar histórico para endpoint `/api/v1/produtos/:id/custos_historicos` mostrar linha de custo em múltiplos meses.

Cada compra seleciona 1–3 produtos com quantidades e custos aleatórios (gera lotes FIFO). Vendas consomem quantidades moderadas (1–8) para evitar estoque negativo.

### Readiness

O script aguarda `/api/v1/status` responder antes de iniciar (timeout ~30s). Use `--no-wait` para pular (útil se já tem certeza que o servidor está pronto ou em ambientes especiais).

### Reprodutibilidade

Passe `--seed 123` para repetir a mesma sequência pseudo-randômica (útil em debugging/perf tuning).

### Logs e Warnings

- `[WARN]`: status inesperado em POST (segue sem abortar aquele recurso).
- `[ERRO]`: falha de rede/fetch (pode indicar servidor indisponível ou CORS se host remoto incorreto).

### Próximas Ideias (não implementado ainda)

- Flag `--dry-run` para apenas simular.
- Export JSON com IDs criados.
- Geração de pedidos parcelados e NF falsa para testar relatórios futuros.

Pull requests são bem-vindos se quiser expandir.

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

**Verificação pós-migração — categoria Devolução de Capital:** Após aplicar a migration `1759610000000_add_despesa_categoria_devolucao_capital`, verifique se existem despesas que representam devolução de capital aos sócios mas estão com categoria "Outros" ou "Empréstimo". Consulte despesas com `categoria = 'outros'` e descrição contendo "Empréstimo", "Devolução" ou similar. Reclassifique manualmente via UI (Editar Despesa → Categoria: Devolução de Capital) os lançamentos que de fato são devoluções de capital. Essas despesas passam a ser excluídas do cálculo de despesas operacionais no DRE e fluxo; o `saldo_a_devolver_socios` no cenário de liquidação é calculado automaticamente (aportes − devoluções).

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
# Relatório consolidado - cenário de liquidação (opcional)
# SALDO_DEVOLVER_SOCIOS=13925.09
# COMISSAO_LIQUIDACAO_PCT=6
```

### Próxima Evolução Sugerida

1. Adicionar expiração de sessão (timestamp em localStorage e revalidação após X horas).
2. Persistir logs com o campo `usuario` (já existe em movimentos de estoque; reutilizar para outras ações administrativas).
3. Migrar estrutura para autenticação server-driven se requisitos de segurança crescerem.
