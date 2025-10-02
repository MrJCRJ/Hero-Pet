# Guia de Estilo e Padronização de Código

Este documento descreve convenções para manter o código sustentável e reduzir complexidade conforme o projeto evolui.

## 1. Limites de Tamanho

- Componentes React: limite "soft" de ~300 linhas. Ao ultrapassar 350, avaliar divisão.
- Hooks: preferir <=150 linhas; se crescer, dividir em sub-hooks ou extrair helpers puros.
- Funções puras >60 linhas: considerar quebrar em funções menores.

## 2. Estrutura de Componentes

Ordem recomendada:

1. Imports (externos → internos → estilos)
2. Constantes/Config locais
3. Hooks de estado/dados
4. Derivados/memos
5. Handlers
6. Efeitos (agrupados por domínio; listeners isolados)
7. Render (return)
8. Subcomponentes (apenas se muito pequenos <50 linhas) — caso contrário, arquivo próprio.

## 3. Extração de Responsabilidades

| Sinal                                          | Ação                                  |
| ---------------------------------------------- | ------------------------------------- |
| Efeito complexo com fetch + setState + parsing | Extrair para hook (`useX`)            |
| JSX de bloco coeso (modal, linha de tabela)    | Subcomponente dedicado                |
| Repetição de cálculos numéricos/formatadores   | `lib/` ou `components/common/*`       |
| Código condicional extenso (switch UI)         | Subcomponentes ou mapa de estratégias |

## 4. Hooks

- Nome sempre `useAlgumaCoisa`.
- Devem receber dependências explicitamente (evitar import oculto de singletons quando possível).
- Efeitos com listeners: limpar sempre e isolar lógica em função nomeada.

## 5. Testes

- Para componentes com cadeia de efeitos assíncronos (fetch -> setState -> derived): usar `renderAndFlush`.
- `ACT_STRICT=1` deve passar sem warnings; novo teste que gera warning precisa ser ajustado antes de merge.
- Evitar `setTimeout` em testes; preferir mocks + flush de microtasks.

## 6. Nomes e Pastas

- Domínio primeiro, especialização depois: `ProductsManager`, `PedidoFormResumoLucro`.
- Hooks específicos de domínio em `components/<domínio>/hooks/` quando não são amplamente reutilizáveis.
- Helpers puros que cruzam domínios → `lib/`.

## 7. Estilos e Classes

- Classes utilitárias Tailwind preferidas a estilos inline.
- Manter consistência de cores via variáveis `var(--color-*)` quando aplicável.

## 8. Tratamento de Erros

- Erros de fetch: sempre fallback seguro (estado vazio) + opcional toast/mensagem.
- Nunca silenciar completamente sem comentário `/* noop */` indicando intenção.

## 9. Formatação e Números

- Formatação monetária centralizada (`formatBRL` etc.).
- Não repetir lógica de parsing de número — usar helpers (`numOrNull`, etc.).

## 10. Refatoração Contínua

Checklist antes de abrir PR grande:

- [ ] Algum arquivo >350 linhas? Considerou extrair?
- [ ] Existem 2+ efeitos similares? Unificar em hook.
- [ ] Testes usam `renderAndFlush` onde há efeitos encadeados?
- [ ] Zero warnings em `npm run test:act-strict`.

## 11. Novos Exemplos Adotados

- `components/products/manager.js` → extraído `ProductCostHistoryChart` + botão de insights.
- `components/pedido/PedidoFormItems.js` → extraídos `useAutoLoadItemCosts`, `PedidoItemRow`, `PedidoFormResumoLucro`, cálculo de frete para `computeFreteShares`.
- `components/products/ProductForm.js` → extraídos `useProductFormLogic`, `ProductFormPricingSection`, `ProductFormSuppliersSection` (redução de responsabilidades e melhor testabilidade futura).

### 11.1 Padrão de Formularios (Hook + \*Section)

Aplicamos um padrão leve para formulários que começam a misturar:

1. Estado de campos básicos
2. Efeitos de carregamento/derivação (fetch custos, sugestões, hints)
3. Blocos de UI coesos (ex: precificação, fornecedores, resumo financeiro)

Estratégia:

- Extrair toda a orquestração e efeitos para `use<Nome>FormLogic`.
- Componentes de seção (ex: `ProductFormPricingSection`) só recebem props derivadas prontas; zero fetch interno.
- Mantém `ProductForm` enxuto: focado em composição e markup.
- Benefícios: menor risco de regressão ao adicionar novos campos, possibilidade de testar hook isolado futuramente e reaproveitar se surgirem variantes (ex: QuickCreate vs FullEdit).

Critério de Adoção:

- Quando arquivo >250 linhas E contém ≥2 efeitos de fetch OU ≥2 grupos de JSX sem dependência cruzada forte.
- Evitar sobre-engenharia em formulários simples (<150 linhas, 0-1 efeito).

## 12. Evolução

Refinamentos futuros:

- Automatizar lint para apontar arquivos > limite soft.
- Criar jest matcher para garantir nenhum uso direto de `render` em pastas marcadas.

### 12.1 Verificação Automática de Formulários Grandes

Script: `npm run lint:forms`.

Regras:

- Falha se existir `*Form.js` >250 linhas sem hook correspondente (`use<Nome>FormLogic|Controller|Form`).
- Exceção temporária: adicionar comentário no topo `// forms-lint: allow-large (motivo)` e abrir tarefa para redução.
- Hook deve conter principais efeitos, fetches e validações, mantendo o componente de formulário focado em markup/composição.

Objetivo: impedir crescimento silencioso e incentivar modularização incremental e testabilidade.

### 12.2 Verificação Automática de Componentes Grandes

Script: `npm run lint:components`.

Regras:

- Componentes >350 linhas sem comentário de exceção: falha.
- Hooks >450 linhas: warning (iniciar plano de divisão). Exceções podem ser anotadas com comentário dentro do arquivo até a refatoração.
- Comentário de exceção temporária permitido (primeiras 5 linhas): `// components-lint: allow-large (motivo)`. Usar somente para desbloquear PR urgente + abrir tarefa.

Sugestões de redução:

1. Extrair subcomponentes visuais (blocos repetidos/tabelas/modais).
2. Extrair hooks de domínio (ex: usePromissoriasSchedule, useProductCosts etc.).
3. Mover cálculos numéricos para `lib/` ou `utils` do domínio.

Meta: manter tempo de leitura inicial < 30s para entender responsabilidades de um componente.

---

Manter este arquivo enxuto; atualizar somente quando decisões forem confirmadas (evitar ruído histórico).
