# Plano de Refatoração (Orders → Pedidos)

## Objetivos

1. Consolidar módulo `orders` dentro de `pedido/` para reduzir duplicação conceitual ("orders" e "pedido" coexistindo).
2. Fatiar componentes grandes em subcomponentes menores e testáveis.
3. Uniformizar padrões de UI (ConfirmDialog, toasts, hooks de dados).
4. Facilitar evolução futura (ex.: relatórios adicionais, KPIs) sem aumentar complexidade de arquivos centrais.

## Inventário Inicial

| Arquivo / Pasta                     | Papel                       | Complexidade                       | Ação Sugerida                                                                            |
| ----------------------------------- | --------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `orders/index.js`                   | Lista principal de pedidos  | Alta (múltiplas responsabilidades) | Quebrar em container + tabela + modais                                                   |
| `orders/OrdersRow.js`               | Linha com ações hover       | Média                              | Extrair menu/ações em subcomponente                                                      |
| `orders/PromissoriasDots.js`        | Status promissórias         | Média (já refatorado)              | Manter; mover para `pedido/shared/`                                                      |
| `orders/charts/*`                   | Gráficos timeline e details | Alta (lógica de formatação)        | Extrair formatação para `charts/shared/formatters.js` (já existe), seguir fatiando hooks |
| `pedido/usePedidoFormController.js` | Controller gigante do form  | Muito Alta                         | Dividir em hooks: `usePedidoItems`, `usePedidoPayments`, `usePedidoTotals`               |
| `pedido/PedidoForm*.js`             | Seções do form              | Média                              | Manter (já segmentado)                                                                   |

## Etapas (Macro)

1. Criação de nova pasta destino `components/pedido/list/` para abrigar antiga listagem (`Orders*`).
2. Renomear: `OrdersRow` → `PedidoRow`, `OrdersHeader` → `PedidoListHeader`, etc.
3. Atualizar imports e rotas que consomem lista de pedidos.
4. Introduzir subcomponentes: `PedidoActionsMenu`, `PedidoFiltersBar` (se aplicável), `PedidoPromissoriasBadge` (wrapper para dots + tooltip).
5. Introduzir hook `usePedidosList` para encapsular fetch, filtros, paginação (já existe parte em `usePedidos` — unificar).
6. Adicionar camada de toasts onde ainda houver `alert()` (auditar módulo pedido).
7. Testes: migrar/duplicar testes de integração apontando para novos componentes; garantir backward compatibility temporária com re-export.
8. Remover pasta `orders/` após período de transição (2 PRs separados).

## Critérios de Fatiamento de Arquivos Grandes

- > 300 linhas ou múltiplos efeitos paralelos → considerar split.
- Trechos de estado derivados (cálculos) que não acessam DOM → mover para hooks puros.
- Render condicional extenso (switch de estados) → extrair para função/arquivo separado quando reutilizável ou quando dificulta leitura.

## Plano de Hooks (Pedido Form Controller)

| Novo Hook           | Responsabilidade                           | Inputs                    | Outputs                                       |
| ------------------- | ------------------------------------------ | ------------------------- | --------------------------------------------- |
| `usePedidoItems`    | Gestão de itens (add/remove/update, diffs) | pedidoId, initialItems    | items, addItem, updateItem, removeItem, diffs |
| `usePedidoPayments` | Promissórias e pagamentos                  | pedidoId, initialPayments | payments, add, remove, calcNextDue            |
| `usePedidoTotals`   | Totais & comissões                         | items, payments, config   | totals, recompute                             |

Cada hook deve ser coberto por testes unitários/hook dedicados.

## Riscos & Mitigações

| Risco                                             | Mitigação                                               |
| ------------------------------------------------- | ------------------------------------------------------- |
| Quebra de imports existentes                      | Criar re-exports temporários com warnings               |
| Divergência de lógica entre hooks novos e antigos | Escrever testes de snapshot/resultado antes da extração |
| Regressão de performance em listas                | Medir antes/depois com console.time em dev              |

## Sequenciamento Proposto

1. (PR1) Introduz pasta `pedido/list/` + copia componentes `Orders*` renomeando, ajusta imports na página que lista pedidos (mantém exports antigos).
2. (PR2) Extrai subcomponentes e hook `usePedidosList`; atualiza testes.
3. (PR3) Fatiar `usePedidoFormController.js` em hooks menores; manter wrapper legado chamando os novos (transição).
4. (PR4) Mover `PromissoriasDots` para `pedido/shared/`; atualizar referências.
5. (PR5) Remover pasta `orders/` antiga e warnings.

## Métricas de Sucesso

- Redução do maior arquivo do módulo pedido para < 200 linhas core por arquivo.
- Cobertura de testes >= cobertura anterior (nenhuma queda).
- Zero usages de `alert()` no módulo pós-migração.
- ConfirmDialogs + toast padrão presentes em todos os fluxos destrutivos.

---

Este plano pode ser refinado conforme surgirem interdependências não mapeadas.
