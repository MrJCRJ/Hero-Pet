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

## 12. Evolução

Refinamentos futuros:

- Automatizar lint para apontar arquivos > limite soft.
- Criar jest matcher para garantir nenhum uso direto de `render` em pastas marcadas.

---

Manter este arquivo enxuto; atualizar somente quando decisões forem confirmadas (evitar ruído histórico).
