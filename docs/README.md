# Documentação do Hero-Pet

Índice da documentação técnica do projeto.

## Documentos

| Arquivo | Descrição |
|---------|-----------|
| [MIGRATION_APP_ROUTER.md](MIGRATION_APP_ROUTER.md) | Plano de migração Pages Router → App Router (Fase 2 concluída) |
| [PLANO_ARQUITETURA_MODULARIZACAO.md](PLANO_ARQUITETURA_MODULARIZACAO.md) | Plano de melhoria de arquitetura, modularização e migração para futuras melhorias |
| [MIGRACOES_TYPESCRIPT.md](MIGRACOES_TYPESCRIPT.md) | Guia para migrações de banco em TypeScript |
| [pedido-controller-split.md](pedido-controller-split.md) | Arquitetura do split do controller de pedido em hooks especializados |

## TypeScript + Zod + TanStack Query + Vitest

- **lib/schemas/**: Schemas Zod para entities e produtos (`entity.ts`, `product.ts`)
- **lib/api/client.ts**: Cliente HTTP para TanStack Query
- **hooks/api/**: `useEntities`, `useEntitySummary`, `useCreateEntity`, `useUpdateEntity`
- **test:unit** (Vitest): testes unitários em `tests/unit/` – lib, schemas
- **test:ci** (Jest): testes de integração em `tests/` – requer servidor Next
