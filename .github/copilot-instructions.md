# Hero-Pet Copilot Instructions

## Overview

This document provides guidance for AI coding agents to be immediately productive in the Hero-Pet codebase. The project has a hybrid structure that integrates frontend components, API endpoints, and comprehensive testing suites. Key directories include:

- **components/**: Contains UI elements, e.g. `ThemeToggle.js`, `Button.js`, and organized subdirectories (`admin`, `common`, `layout`, `entity`). The `entity/` folder abriga a refatoração do antigo `EntityForm` agora dividido em partes especializadas (ver seção "Entity Form Refactor").
- **pages/**: Next.js style pages, including `_app.js` for app-level configuration and API routes under `api/v1` for structured backend endpoints.
- **tests/**: Organized unit and integration tests mirroring the codebase structure, ensuring reliability of both UI components and API logic.
- **infra/**: Includes critical infrastructure scripts and configurations, e.g. `database.js`, and orchestration files like `compose.yaml` and `scripts/wait-for-postgres.js` for dependency management.

## Architecture & Conventions

- **Modular Design**: Components, hooks, and API routes are organized por funcionalidade. Para lógica de entidade, o formulário foi decomposto em componentes autocontidos com responsabilidades claras (tipo, documento, endereço, contato, status). Ver também `hooks/useAuth.js` e `hooks/useStatus.js` para padrões de encapsulamento.
- **API Structure**: API routes are versioned (e.g. `api/v1/status` and `api/v1/migrations`), promoting a clear separation between different service boundaries.
- **Styling**: Tailwind CSS is used for styling (`tailwind.config.js`, `globals.css`), reflecting a consistent design system across the project.

## Developer Workflows

- **Building & Running**: The project uses `npm run dev` for development. Refer to `package.json` for custom scripts and further build instructions.
- **Testing**: Estratégia prioriza testes de integração (UI e API) em vez de unitários isolados. UI em `tests/integration/` cobre fluxo completo de máscara + validação. APIs em `tests/api/v1` usam ambiente Node. Global server é iniciado uma vez via `globalSetup` para reduzir flakiness e EADDRINUSE. Ver seção "Testing Strategy".
- **Debugging**: Entry points such as `pages/_app.js` for frontend and directories under `pages/api` for backend logic should be primary focus areas.
- **Database & Migrations**: Database setup is managed under `infra/database.js` with migration scripts in both `migrations/` and `api/v1/migrations`. The `scripts/wait-for-postgres.js` script ensures smooth integration with Postgres.

## Patterns & Examples

- **Dynamic UI**: `components/ThemeToggle.js` demonstra uso de contexto de tema (`contexts/ThemeContext.js`). Em formulários complexos, `components/entity/DocumentSection.js` mostra padrão de classificação de status em blur + exibição de badges.
- **API Endpoints**: `pages/api/v1/status/index.js` provides a clear example of concise request-response patterns.
- **Test Organization**: Tests in `tests/` follow naming conventions that reflect the source file they test, ensuring maintainability.

### Shared Validation Patterns (patterns.js)

Para evitar divergência entre frontend e backend quanto a validação de contato (telefone/email), o arquivo `lib/validation/patterns.js` centraliza:

- `EMAIL_REGEX`: Expressão usada em validação JS e replicada (case-insensitive) em filtros/aggregates SQL.
- `PHONE_FIXED_REGEX` / `PHONE_MOBILE_REGEX`: Regras Brasil (fixo de 10 dígitos, celular 11 iniciando com 9) consumidas por `isValidPhone`.
- `SQL_PHONE_FIXED`, `SQL_PHONE_MOBILE`, `SQL_EMAIL`: Fragmentos string para interpolação segura em queries (evita duplicação literal).

Sempre que atualizar a regra de telefone/email, alterar primeiro em `patterns.js` e depois (se necessário) ajustar pontos dependentes (`completeness.js`, endpoints `entities` e `summary`). Isso previne inconsistências de classificação (ex.: `contact_fill`).

## Additional Notes

- Maintain the file structure and naming conventions when updating or adding new features.
- Refer to inline comments in key files for deeper insights into project-specific decisions.
- For any changes or clarifications, consult this document to ensure consistent coding practices across the codebase.

## Entity Form Refactor

O antigo `components/EntityForm.js` foi segmentado para facilitar manutenção, testes e futuras extensões:

- `entity/EntityTypeSelector.js`: Seleciona pessoa física/jurídica (controla formato esperado de CPF/CNPJ).
- `entity/DocumentSection.js`: Campo de documento + checkbox de pendência + badge de status + mensagens contextuais.
- `entity/AddressSection.js`: Campos de endereço (CEP formatado, etc.).
- `entity/ContactSection.js`: Telefone/email (telefone mascarado, dígitos armazenados crus).
- `entity/StatusToggle.js`: Ativação/inativação lógica da entidade.
- `entity/utils.js`: Funções utilitárias de máscara e validação (fonte única de verdade para formatação e classificação).

### Regras de Estado

O estado interno armazena somente valores "limpos" (apenas dígitos para CPF/CNPJ/CEP/telefone). A formatação (máscaras) é aplicada na renderização ou em handlers de exibição sem corromper o estado base.

## Masking & Validation Guidelines

Centralizado em `components/entity/utils.js`:

- `stripDigits(value)`: Remove tudo exceto 0-9 (use sempre antes de persistir ou validar).
- `formatCpfCnpj(digits)`: Retorna máscara dinâmica (11 dígitos -> CPF; 12–14 -> parcial/formatando CNPJ) sem lançar erros em entradas parciais.
- `formatCep(digits)`: #####-### conforme crescimento.
- `formatTelefone(digits)`: Suporta (XX) 9XXXX-XXXX ou (XX) XXXX-XXXX conforme comprimento.
- `isValidCPF(digits)` / `isValidCNPJ(digits)`: Validação algorítmica (dígitos verificadores). Não lança; retorna boolean.
- `classifyDocument(digits, isPendingFlag)`: Retorna um dos `pending | provisional | valid`:
  - pending: Checkbox marcado ou nenhum dígito.
  - provisional: Estrutura incompleta ou inválida mas há algum progresso (ex.: 5 dígitos CPF ou CNPJ parcial).
  - valid: Passou validação algorítmica e comprimento correto.

### Princípios

1. UI nunca bloqueia submit em estados `pending` ou `provisional` (soft validation).
2. Armazene sempre só dígitos crus no estado/base de dados.
3. Máscaras não devem reformatar agressivamente entradas parciais (evitar salto de cursor ou perda de dígitos).
4. Mudanças de foco (`onBlur`) disparam reclassificação de status em vez de cada `onChange` para reduzir churn visual.

## Testing Strategy

### Stack

- Jest 29.x (compatibilidade sólida com jsdom atual).
- Ambientes distintos:
  - UI: `testEnvironment: jsdom` (padrão config principal).
  - API: Arquivos de teste com `@jest-environment node` no topo para evitar sobrecarga jsdom.
- `globalSetup` / `globalTeardown`: Sobe o servidor Next uma única vez; evita criar múltiplos processos.
- Orquestrador (`tests/orchestrator.js`): Faz polling HTTP com retries exponenciais até readiness.

### Convenções de Teste

- Integração UI (ex.: `tests/integration/DocumentStatus.integration.test.js`): Simula digitação progressiva e usa `user.tab()` para mudar foco (evita warnings de act()).
- Teste de máscaras isoladas usa wrapper local com `useState` para garantir re-render.
- Validação algorítmica coberta indiretamente via classificação de status.
- Evite testes ultra unitários de funções simples de formatação — preferir validar comportamento final via fluxo.

### Boas Práticas

- Nunca iniciar `next dev` manualmente durante `npm test`; confiar no setup global.
- Se adicionar novo endpoint, criar pasta espelhada em `tests/api/v1/<endpoint>`.
- Para novos componentes de formulário, criar teste de integração adicionando casos: entrada parcial, máscara completa, blur, classificação.

## Adding New Form Fields

1. Adicionar campo em subcomponente apropriado (ou criar nova seção se semântica distinta).
2. Adicionar função de formatação/normalização em `entity/utils.js` (seguir padrão idempotente).
3. Atualizar `EntityForm` para armazenar valor bruto normalizado.
4. Criar teste de integração cobrindo fluxo parcial → completo → blur.
5. (Opcional) Adicionar futura persistência: criar migração em `infra/migrations/` e endpoint correspondente.

## Document Status Extension

Para adicionar novo status (ex.: `expired`):

1. Ajustar `classifyDocument` para retornar novo rótulo baseado em regra.
2. Atualizar mapa de estilos em `DocumentSection` (`STATUS_STYLES`).
3. Adicionar casos de teste cobrindo transição e apresentação.
4. Manter retrocompatibilidade (não remover rótulos existentes sem migração de dados).

## Backend Persistence (Futuro)

Quando for persistir `document_status` e `documento_pendente`:

- Criar migração adicionando colunas (`document_status VARCHAR(20)`, `documento_pendente BOOLEAN`).
- Garantir default coerente (`document_status` -> 'pending', `documento_pendente` -> FALSE).
- Atualizar endpoints POST/PUT para recalcular status server-side usando a mesma lógica (duplicar util ou mover para pacote compartilhado/node). Ideal: extrair lógica para módulo compartilhado (ex.: `lib/validation/document.js`).
- Adicionar endpoint/listagem de entidades pendentes para auditoria operacional.

## Entities Persistence (Implementado)

Tabela `entities` criada via migração dedicada com campos:

- id (PK)
- name (TEXT, uppercased no servidor)
- entity_type ('PF' | 'PJ')
- document_digits (somente dígitos)
- document_status ('pending' | 'provisional' | 'valid')
- document_pending (boolean)
- cep, telefone, email (TEXT opcionais)
- created_at, updated_at (timestamptz)

### Endpoints

- `POST /api/v1/entities`: Normaliza e grava; recalcula status server-side (não confia no front).
- `GET /api/v1/entities`: Lista com filtros:
  - `status`: pending | provisional | valid
  - `pending`: true | false
  - `limit`: padrão 100 (máx 500)

### Regras de Status (Servidor)

1. `pending` se checkbox marcado ou sem dígitos.
2. Comprimento incompleto (CPF <11 / CNPJ <14) => `provisional`.
3. Comprimento completo inválido algorítmicamente => `provisional`.
4. Completo e válido => `valid`.

### Consistência

- Reuso da função de classificação do front (import direto de `components/entity/utils.js`).
- Nome uppercased garante busca/padrão consistente.
- Índices em `document_status`, `document_pending`, `entity_type`, `created_at` para filtros comuns.

### Test Coverage

- Criação (pendente, provisional, valid).
- Filtros por status e pending.
- Filtros inválidos retornam 400.
- Algoritmos de CPF/CNPJ refletidos via classificação.

### Próximos Passos Recomendados

- Extrair lógica de classificação para módulo compartilhado (evitar import de `components/` no backend).
- Adicionar paginação (cursor ou offset) e campo `total`.
- Endpoint de agregados (ex: `/api/v1/entities/summary`).
- Histórico de mudanças (audit trail) se houver necessidade regulatória.

### Audit Trail (Planejado)

Caso seja necessário rastrear alterações de status/documento:

1. Criar tabela `entity_events` (id, entity_id, old_status, new_status, occurred_at, actor/contexto).
2. Trigger (ou lógica na camada POST/PUT futura) insere registro quando `document_status` mudar.
3. Endpoint `/api/v1/entities/:id/history` retorna eventos ordenados.
4. Evitar armazenar dados redundantes (somente difs relevantes).
5. Adicionar índice em (entity_id, occurred_at DESC) para paginação eficiente.

## Performance & Stability Notes

- Reuso de servidor de teste reduz latência total da suíte.
- Estratégia de retry no orquestrador evita flakiness em ambientes CI mais lentos.
- Separação de ambiente Node evita custo de jsdom nos testes de API.

## Common Pitfalls

| Problema                            | Causa                                     | Solução                                                   |
| ----------------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| EADDRINUSE ao rodar testes          | Servidor Next duplicado                   | Remover execução manual e confiar no globalSetup          |
| Warnings de act()                   | Interações sem mudança de foco controlada | Usar `user.tab()` ou wrap em `await act(async () => ...)` |
| Máscara sobrescreve entrada parcial | Função não idempotente                    | Garantir formatação incremental e baseada em comprimento  |
| Validação bloqueando fluxo          | Uso de validação hard                     | Manter classifyDocument soft e não impedir submit         |

## Quick Reference: utils.js

```
formatCpfCnpj(digits) -> string
formatCep(digits) -> string
formatTelefone(digits) -> string
isValidCPF(digits) -> boolean
isValidCNPJ(digits) -> boolean
classifyDocument(digits, isPending) -> 'pending' | 'provisional' | 'valid'
```

## Future Improvements (Roadmap)

- Persistência e consistência server-side de `document_status`.
- Relatório / dashboard de documentos pendentes e provisórios.
- Observabilidade: métricas de tempo até validação (valid lead time).
- Linter custom para garantir uso de util de máscara centralizada.
- Testes e2e (Playwright) para fluxo ponta a ponta (opcional).

## Contribution Checklist (Novos PRs)

1. Usou funções centrais de util — sem duplicação local?
2. Teste de integração cobrindo estados principais adicionado?
3. Sem warnings de console / act() na execução da suíte?
4. Scripts ou migrações ajustados quando há mudança de schema?
5. Documentação (este arquivo) atualizada se introduziu novo padrão?

---

Se manter estes princípios, o código permanece previsível, testável e fácil de evoluir. Bons commits!
