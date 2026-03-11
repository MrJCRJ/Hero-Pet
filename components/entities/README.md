# Módulo Entities (Clientes / Fornecedores)

## Responsabilidade

Gestão de entidades (clientes e fornecedores): CRUD, filtros, validação de documentos.

## Estrutura

```
components/entities/
├── form/           # Formulário e controller
├── list/           # Tabela, browser, filtros
└── shared/         # Toast, máscaras, StatusDot
```

## Hooks (hooks/api/)

| Hook | Uso |
|------|-----|
| `useEntities` | Lista com filtros (TanStack Query) |
| `useEntitySummary` | Resumo/agregados |
| `useCreateEntity` | Criar entidade |
| `useUpdateEntity` | Atualizar entidade |

## API

- `GET /api/v1/entities` — lista
- `POST /api/v1/entities` — criar
- `GET /api/v1/entities/:id` — obter
- `PUT /api/v1/entities/:id` — atualizar
- `DELETE /api/v1/entities/:id` — excluir
- `GET /api/v1/entities/summary` — resumo

## Schemas (lib/schemas/)

- `entity.ts` — parseEntityBody, deriveDocumentStatus
