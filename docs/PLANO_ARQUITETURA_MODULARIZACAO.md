# Plano de Melhoria de Arquitetura e Modularização — Hero-Pet

Este documento define um plano estratégico para evoluir a arquitetura do Hero-Pet, completar a migração para App Router e preparar o projeto para modularização e futuras melhorias.

---

## 1. Estado Atual (Diagnóstico)

### 1.1 Pontos Fortes

| Aspecto | Situação |
|---------|----------|
| Framework | Next.js 15 + React 19 |
| App Router | Parcialmente migrado (entities, products, orders, expenses) |
| Roteamento | Route groups `(main)` com MainLayout |
| Domínios | Componentes organizados por domínio (entities, products, pedidos, despesas) |
| Validação | Zod em entities e products |
| Dados | TanStack Query para entities; cliente API em TypeScript |
| Infraestrutura | Docker, migrações PostgreSQL centralizadas em `infra/` |
| Testes | Jest (integração), Vitest (unitário) para lib/schemas |

### 1.2 Pontos de Atenção

| Aspecto | Problema |
|---------|----------|
| **Mixed stack** | JS e TS misturados sem padrão claro |
| **API Routes** | Ainda em `pages/api/` (legado) |
| **Hooks** | Espalhados: `hooks/api/` (entities), `components/*/hooks*` (products, pedidos) |
| **Acoplamento** | Componentes importam infra diretamente; pouca abstração |
| **Lib** | `lib/` contém código de domínio (fifo, pedidos, pdf) misturado com utilitários |
| **Types** | `types/index.ts` quase vazio; tipos inline ou ausentes |
| **Pages legadas** | ~~`pages/index.js`, `pages/_app.js` e `globals.css` em `pages/`~~ — **Fase 1 concluída** |
| **Consistência** | Padrões diferentes entre entities (TS, hooks centralizados) e pedidos (JS, hooks no componente) |

---

## 2. Visão da Arquitetura Alvo

### 2.1 Princípios

1. **Módulos por domínio** — Cada domínio (entities, products, orders, expenses) é autocontido.
2. **Camadas claras** — UI → hooks → API client → API routes; lib compartilhada desacoplada.
3. **TypeScript-first** — Novos arquivos em TS; migração incremental de JS.
4. **Single source of truth** — Schemas Zod como base de validação e tipos.
5. **Testabilidade** — Lógica de negócio isolada e testável (unitária); UI testada em integração.

### 2.2 Estrutura Proposta (Feature-Module)

```
Hero-Pet/
├── app/
│   ├── layout.js                    # Root layout
│   ├── page.js                      # Home
│   ├── globals.css                  # ← Migrado de pages/
│   └── (main)/
│       ├── layout.js
│       ├── MainLayout.js
│       ├── entities/page.js
│       ├── products/page.js
│       ├── orders/page.js
│       └── expenses/page.js
│
├── app/api/                         # Route Handlers (App Router)
│   └── v1/
│       ├── entities/[...path]/
│       ├── produtos/[...path]/
│       ├── pedidos/[...path]/
│       ├── despesas/[...path]/
│       ├── estoque/[...path]/
│       ├── status/
│       └── migrations/
│
├── src/                             # Código de aplicação (opcional, evolução)
│   ├── modules/                     # Módulos por domínio
│   │   ├── entities/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   ├── schemas/
│   │   │   └── types.ts
│   │   ├── products/
│   │   ├── orders/
│   │   └── expenses/
│   │
│   ├── shared/
│   │   ├── api/                     # client.ts, tipos base
│   │   ├── components/              # ui, layout, common
│   │   ├── hooks/                   # globais
│   │   ├── lib/                     # utils, validação, erros
│   │   └── contexts/
│   │
│   └── server/                      # Lógica server-side reutilizável
│       ├── db/
│       └── services/
│
├── lib/                             # Mantido na raiz (migração gradual para src/shared)
│   ├── api/client.ts
│   ├── schemas/
│   ├── errors.js
│   └── validation/
│
├── hooks/
├── components/
├── contexts/
├── infra/
├── pages/                           # Durante migração: só API ou vazio
└── tests/
```

**Nota:** A pasta `src/` é opcional no curto prazo. O plano prioriza primeiro a modularização dentro da estrutura atual (`components/`, `hooks/`, `lib/`), e depois a adoção de `src/modules/` se fizer sentido.

---

## 3. Plano de Execução em Fases

### Fase 1 — Finalizar Migração App Router (Prioridade Alta)

**Objetivo:** Eliminar dependência do Pages Router para UI.

| # | Tarefa | Esforço |
|---|--------|---------|
| 1.1 | ✅ Mover `globals.css` de `pages/` para `app/globals.css` | Baixo |
| 1.2 | ✅ Remover `pages/index.js` e `pages/_app.js` | Baixo |
| 1.3 | Garantir que todas as rotas funcionem via App Router | Médio |
| 1.4 | Atualizar testes e scripts que referenciam Pages | Baixo |

**Resultado:** Pages Router usado apenas para API ou removido.

---

### Fase 2 — Migrar API Routes para App Router (Prioridade Alta)

**Objetivo:** Centralizar rotas em App Router; suportar Server Components e streaming.

| # | Tarefa | Esforço |
|---|--------|---------|
| 2.1 | ✅ Criar `app/api/v1/*/route.js` para todas as rotas | Alto |
| 2.2 | ✅ Handlers extraídos em `server/api/v1/` | Médio |
| 2.3 | ✅ Adapter `lib/server/withPagesHandler.js` (req/res → Request/Response) | Médio |
| 2.4 | ✅ Compatibilidade de URL mantida | Baixo |
| 2.5 | ✅ Removido `pages/api/` | Baixo |

**Padrão sugerido:**

```ts
// app/api/v1/entities/route.ts
import { NextResponse } from "next/server";
import { getEntities, postEntity } from "@/server/entities/handlers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return getEntities(searchParams).then(NextResponse.json).catch(handleError);
}

export async function POST(request: Request) {
  const body = await request.json();
  return postEntity(body).then(NextResponse.json).catch(handleError);
}
```

---

### Fase 3 — Modularização por Domínio (Prioridade Média)

**Objetivo:** Cada domínio concentra componentes, hooks, schemas e tipos.

| # | Tarefa | Esforço |
|---|--------|---------|
| 3.1 | ✅ **Entities** — Consolidar em `components/entities/` + `hooks/api/` | Baixo |
| 3.2 | ✅ **Products** — Criar `hooks/api/useProducts.ts`, `useProductMutations.ts` | Médio |
| 3.3 | ✅ **Orders** — Criar `hooks/api/useOrders.ts` (lista); hooks específicos em `components/pedidos/` | Médio |
| 3.4 | ✅ **Expenses** — Criar `hooks/api/useDespesas.ts`, `useDespesaMutations.ts`, `lib/schemas/despesa.ts` | Médio |
| 3.5 | ✅ Documentar contrato de cada módulo (README em components/entities, products, despesas) | Baixo |

**Convenção de hooks:**

- `hooks/api/` — Hooks de dados (TanStack Query): `useEntities`, `useProducts`, `useOrders`, `useDespesas`
- `components/<domínio>/hooks/` — Hooks de UI/lógica local: `useProductFormLogic`, `usePedidoItems`

---

### Fase 4 — Reorganização da Lib (Prioridade Média) ✅

**Objetivo:** Separar utilitários genéricos de lógica de domínio.

| # | Tarefa | Esforço |
|---|--------|---------|
| 4.1 | ✅ `lib/errors.js` → `lib/shared/errors.ts` | Baixo |
| 4.2 | ✅ `lib/validation/` → migrado para TS | Baixo |
| 4.3 | ✅ `lib/fifo.js`, `lib/pedidos/` → `lib/domain/pedidos/` | Médio |
| 4.4 | ✅ `lib/pdf/` → `lib/domain/pdf/` | Médio |
| 4.5 | ✅ `lib/constants/` → tipado com TypeScript | Baixo |

---

### Fase 5 — TypeScript e Tipos (Prioridade Média) — Em andamento

**Objetivo:** Base sólida de tipos; novos arquivos em TS.

| # | Tarefa | Esforço |
|---|--------|---------|
| 5.1 | ✅ Popular `types/index.ts` com tipos compartilhados (Entity, Product, Order, Despesa, filtros) | Médio |
| 5.2 | ✅ Re-exportar tipos de schemas Zod em `types/index.ts` | Baixo |
| 5.3 | ✅ Documentar `lib/api/client.ts` (tipagem genérica) | Baixo |
| 5.4 | ✅ Hooks em `hooks/api/` importando de `@/types` | Baixo |
| 5.5 | Habilitar `strict: true` no `tsconfig.json` gradualmente | Alto |
| 5.6 | Migrar componentes críticos para TS — entities ✅; products pendente | Alto |

---

### Fase 6 — Server Components e Performance (Prioridade Baixa)

**Objetivo:** Usar Server Components onde fizer sentido.

| # | Tarefa | Esforço |
|---|--------|---------|
| 6.1 | Identificar páginas/listas que podem buscar dados no servidor | Médio |
| 6.2 | Criar Server Components para layouts estáticos | Baixo |
| 6.3 | Manter Client Components onde há interatividade (forms, modals, charts) | - |
| 6.4 | Documentar decisão Server vs Client por tela | Baixo |

---

### Fase 7 — Testes e Qualidade (Contínuo)

| # | Tarefa | Esforço |
|---|--------|---------|
| 7.1 | Garantir cobertura em `lib/`, `hooks/api/` e schemas | Médio |
| 7.2 | Alinhar testes de integração ao App Router | Baixo |
| 7.3 | Adicionar testes para novos Route Handlers | Médio |
| 7.4 | Manter scripts de lint (forms, components, hooks) | Baixo |

---

## 4. Ordem Recomendada de Execução

```
Fase 1 (1–2 semanas)  →  Finalizar App Router
        ↓
Fase 2 (2–4 semanas)  →  Migrar API para app/api
        ↓
Fase 3 (2–3 semanas)  →  Modularização por domínio
        ↓
Fase 4 (1–2 semanas)  →  Reorganizar lib
        ↓
Fase 5 (contínuo)     →  TypeScript e tipos
        ↓
Fase 6 (opcional)     →  Server Components
```

Fase 7 deve ser aplicada em paralelo a todas as fases.

---

## 5. Checklist de Modularização por Domínio

Para cada domínio (entities, products, orders, expenses):

- [ ] Componentes do domínio em `components/<domínio>/`
- [ ] Hooks de dados em `hooks/api/use<Domínio>.ts` e `use<Domínio>Mutations.ts`
- [ ] Schemas Zod em `lib/schemas/<domínio>.ts`
- [ ] Tipos exportados em `types/index.ts` ou módulo próprio
- [ ] API routes em `app/api/v1/<domínio>/`
- [ ] Handlers de API extraídos para funções testáveis
- [ ] README do domínio com responsabilidades e contrato

---

## 6. Referências e Conventions

- [Next.js App Router](https://nextjs.org/docs/app)
- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Feature-Sliced Design](https://feature-sliced.design/) (inspiração para módulos)
- [MIGRATION_APP_ROUTER.md](./MIGRATION_APP_ROUTER.md) — plano atual de migração
- [pedido-controller-split.md](./pedido-controller-split.md) — hooks de pedido

---

## 7. Resumo Executivo

| Fase | Objetivo | Impacto |
|------|----------|---------|
| 1 | Finalizar App Router | Remove Pages Router da UI; base limpa |
| 2 | API em App Router | Unifica stack; prepara Server Components |
| 3 | Modularização | Manutenção por domínio; onboarding mais simples |
| 4 | Reorganizar lib | Separação de responsabilidades |
| 5 | TypeScript | Menos bugs; DX melhor |
| 6 | Server Components | Melhoria de performance (opcional) |

**Prioridade imediata:** ~~Fase 1~~ (concluída), ~~Fase 2~~ (concluída), ~~Fase 3~~ (concluída), ~~Fase 4~~ (concluída). Próximo: Fase 5 (5.5 strict, 5.6 migração de componentes).
