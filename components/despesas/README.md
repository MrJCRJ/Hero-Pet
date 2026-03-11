# Módulo Despesas

## Responsabilidade

Gestão de despesas: CRUD, filtros por categoria/status/mês, totais (pago/pendente).

## Estrutura

```
components/despesas/
├── DespesasManager.js   # Orquestrador
├── DespesasTable.js     # Tabela
├── DespesasFilters.js   # Filtros
└── DespesaForm.js       # Formulário
```

## Hooks (hooks/api/)

| Hook | Uso |
|------|-----|
| `useDespesas` | Lista com filtros (TanStack Query) |
| `useCreateDespesa` | Criar despesa |
| `useUpdateDespesa` | Atualizar despesa |
| `useDeleteDespesa` | Excluir despesa |

## API

- `GET /api/v1/despesas` — lista (query: categoria, status, mes, ano, page, limit)
- `POST /api/v1/despesas` — criar
- `GET /api/v1/despesas/:id` — obter
- `PUT /api/v1/despesas/:id` — atualizar
- `DELETE /api/v1/despesas/:id` — excluir

## Schemas (lib/schemas/)

- `despesa.ts` — parseDespesaBody, DespesaInput
