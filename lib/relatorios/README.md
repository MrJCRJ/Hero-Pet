# Relatórios Hero Pet

Este módulo concentra a geração do relatório consolidado e dos indicadores financeiros usados pela API.

## Arquitetura (visão rápida)

- `fetchDadosConsolidado.ts`: orquestra leituras, cálculos e montagem do payload consolidado.
- `exportJsonConsolidado.ts`: converte o payload interno para JSON versionado (snake_case).
- `computeIndicadores.ts`: calcula indicadores base (PMR, PMP, giro de estoque, DVE).
- `buildIndicadoresConsolidados.ts`: agrega indicadores base + derivados BI em uma única saída.
- `computeIndicadoresDerivadosBi.ts`: ciclo de caixa, giro de contas a receber e contexto de confiança.
- `parseRelatoriosQuery.ts`: validação unificada de parâmetros de entrada (com Zod).

Consultas reutilizáveis de indicadores ficam em:

- `lib/db/queries/relatoriosIndicadores.ts`

## Como adicionar um novo cálculo

1. Adicione a função pura em `lib/relatorios/` (ou em utilitário específico).
2. Cubra com teste unitário em `tests/unit/lib/relatorios/`.
3. Se o cálculo entrar no consolidado:
   - integre em `fetchDadosConsolidado.ts`;
   - atualize o mapeamento em `exportJsonConsolidado.ts` se fizer parte do contrato JSON;
   - valide o contrato em `tests/schemas/` e nos testes de API.

## Organização de testes

- Unitários (Vitest): `tests/unit/lib/relatorios/`
  - foco em funções puras e regras de cálculo.
- Integração/API (Jest): `tests/api/v1/relatorios/`
  - foco em endpoints e consistência de payload.
- Contrato (schema): `tests/schemas/`
  - schemas Zod para validação de estrutura da resposta consolidada.

## Executando testes

- Unitários:
  - `npm run test:unit`
- Integração/API:
  - `npm run test` (usa serviços locais)
  - `npm run test:ci` (sem `docker compose`, usado no CI)

## Variáveis de ambiente para testes

Para integração/Jest, use um banco de testes dedicado (`.env.test`). Nunca execute contra banco de produção.

Variáveis principais:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `NODE_ENV=test`

O `globalSetup` bloqueia execução quando detecta banco de produção/cloud para evitar perda de dados.
