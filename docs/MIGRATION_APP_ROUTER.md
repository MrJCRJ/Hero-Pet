# Plano de Migração: Pages Router → App Router (Next.js)

Este documento descreve a organização do projeto e o plano para migrar do **Pages Router** para o **App Router** do Next.js 15.

## Estado Atual

| Aspecto | Atual |
|---------|-------|
| Framework | Next.js 15 + React 19 |
| Roteamento | Pages Router (`pages/`) |
| Estrutura | SPA com abas em `pages/index.js` |
| API | `app/api/v1/*` (Route Handlers; handlers em `server/api/v1/`) |
| Estilização | TailwindCSS 4 + globals.css em app/ |

## Nova Estrutura

```
Hero-Pet/
├── app/                    # App Router
│   ├── layout.js           # Root layout com providers
│   ├── page.js             # Página inicial (/)
│   └── (main)/             # Route group
│       ├── layout.js       # MainLayout (auth + shell)
│       ├── MainLayout.js   # Client: header, StatusNav, MainNav
│       ├── entities/       # /entities
│       ├── products/       # /products
│       ├── orders/         # /orders
│       └── expenses/       # /expenses
│
├── pages/                  # Durante migração: API routes + fallback
│   └── api/                # API routes permanecem aqui
│       └── v1/
│
├── components/             # Componentes (já organizado por domínio)
│   ├── admin/
│   ├── common/
│   ├── despesas/
│   ├── entities/
│   ├── home/               # Conteúdo da home extraído
│   ├── layout/
│   ├── pedidos/
│   ├── products/
│   └── ui/
│
├── hooks/                  # Hooks globais
├── lib/                    # Utilitários e validações
├── contexts/               # Contextos React
├── infra/                  # Docker, migrações
└── tests/
```

## Path Aliases Configurados

O `jsconfig.json` foi atualizado com aliases para imports limpos:

```js
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
```

| Alias | Diretório |
|-------|-----------|
| `@/` | Raiz do projeto |
| `@/components` | components/ |
| `@/hooks` | hooks/ |
| `@/lib` | lib/ |
| `@/contexts` | contexts/ |
| `@/pages` | pages/ |

## Estratégia de Migração Incremental

O Next.js 15 permite **coexistência** de `app/` e `pages/` durante a migração:

1. **Fase 1 (Feito)** – Organização inicial
   - Path aliases configurados
   - `HomePage` extraído para componente reutilizável
   - Estrutura `app/` criada com layout e página inicial

2. **Fase 2 (Feito)** – Migrar páginas para App Router
   - Rotas em `app/` têm precedência sobre `pages/`
   - Criado `app/(main)/entities/`, `app/(main)/products/`, `app/(main)/orders/`, `app/(main)/expenses/`
   - `MainNav` com Links para navegação client-side
   - `MainLayout` para shell autenticado (header, StatusNav, MainNav)
   - HomePage usa MainNav; hash `#tab=entities` redireciona para `/entities`

3. **Fase 3** – Ajustar API e Server Components
   - API routes permanecem em `pages/api/` (suportado)
   - Identificar componentes que podem virar Server Components
   - Usar `"use client"` apenas onde necessário (hooks, event handlers, localStorage)

4. **Fase 4 (Feito)** – Finalização
   - Removido `pages/_app.js` (pages/index.js já não existia)
   - `globals.css` movido para `app/globals.css`
   - Atualizar testes e scripts

## Directives do App Router

- **Server Components** (padrão): não usar hooks, sem `"use client"`
- **Client Components**: adicionar `"use client"` no topo do arquivo quando usar:
  - `useState`, `useEffect`, `useContext`
  - Event handlers (`onClick`, etc.)
  - `localStorage`, `window`
  - Bibliotecas que dependem do browser

## Checklist de Migração por Componente

- [ ] O componente usa hooks do React? → `"use client"`
- [ ] O componente usa `localStorage` ou `window`? → `"use client"`
- [ ] O componente é puramente presentacional? → Pode ser Server Component
- [ ] Atualizar imports para usar aliases `@/`

## Testes (TDD)

Testes do App Router em `tests/app/` e `tests/components/MainNav.test.js`:

- **AppRouter.pages.test.js**: HomePage, EntitiesPage, ProductsPage, OrdersPage, ExpensesPage
- **MainNav.test.js**: Links, rotas, acessibilidade

Rodar: `npm run test:ci -- tests/app tests/components/MainNav`

O `globalSetup` inicia o servidor Next; tanto Pages quanto App Router são servidos pelo mesmo servidor.

## Referências

- [Next.js App Router](https://nextjs.org/docs/app)
- [Migrating from Pages to App Router](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [Server and Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
