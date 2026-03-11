# Testes do App Router

Testes TDD para as páginas e componentes do App Router (Next.js 15).

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `AppRouter.pages.test.js` | HomePage, EntitiesPage, ProductsPage, OrdersPage, ExpensesPage |

## Rodar

```bash
npm run test:ci -- tests/app
```

## Padrão TDD

1. **RED**: Escrever teste que falha
2. **GREEN**: Implementar o mínimo para passar
3. **REFACTOR**: Melhorar código mantendo testes verdes

## Mocks

- `fetch`: mock global em `beforeEach` para APIs
- `localStorage`: `adminAuthenticated` e `adminAuthenticatedUser` para simular auth
- `ThemeProvider` + `ToastProvider`: wrapper padrão
