# Módulo Pedidos (Unificado)

Este diretório consolida **dashboard (antigo orders)** + **formulário e lógica de edição (antigo pedido)** em um único domínio `pedidos`.

## Objetivos da Unificação

- Evitar caminhos mistos (`components/orders` vs `components/pedido`).
- Facilitar navegação: criação, listagem, métricas e edição no mesmo escopo.
- Reduzir duplicação de hooks utilitários e constantes.

## Estrutura

```
components/pedidos/
  orders/                # Dashboard, gráficos, cards e modais (ex-orders)
    charts/
    dashboard/
    modals/
    shared/              # hooks.js, utils.js, constants.js, Card, PromissoriasList
  list/                  # Listagem simplificada alternativa (PedidoList*)
  PedidoForm*.js         # Form principal modularizado
  usePedido*.js          # Hooks de domínio (itens, totais, promissórias, side-effects)
  service*.js            # Chamadas HTTP (create/update/delete etc.)
  quick-add/             # Fluxo de adição rápida de itens
  events.js              # Disparo/assinatura de eventos custom do domínio
  utils.js               # Helpers diversos
  README.md              # Este arquivo
```

## Fluxos Principais

- **Dashboard** (`orders/dashboard/OrdersDashboard.js`): métricas mensais, modais explicativos e cartões clicáveis.
- **Lista Paginada** (`orders/index.js` via `OrdersManager` embutido ou `list/PedidoList*`): filtros (tipo, busca, período), paginação baseada em `usePaginatedPedidos` com fallback para resposta legacy.
- **Formulário** (`PedidoForm*`): criação/edição reutilizando hooks de cálculo (totais, lucro, promissórias, itens).

## Hooks Relevantes

- `usePaginatedPedidos` (global em `hooks/`): controla paginação + meta.
- `orders/shared/hooks.js`: `useDashboardData`, `useMonthState`.
- `usePedidoFormController`: orquestra estado do form inteiro.
- `usePedidoTotals`, `usePedidoItems`, `usePedidoPromissorias`: cálculos específicos.

## Deep-Link Highlight

Parâmetro `?highlight=<id>` abre automaticamente o formulário de edição (carregando via `useHighlightEntityLoad`). Após abrir, o parâmetro é removido da URL para evitar reprocessar.

## Persistência Local

- Filtros da lista: `localStorage['orders.filters']` (TODO: renomear para `pedidos.filters` em evolução futura para manter legado estável agora).
- Mês do dashboard: `localStorage['orders.dashboard.month']`.

## Padrões de Teste

- Integração: `tests/integration/Orders.*.integration.test.js` e `PedidoForm.*.integration.test.js`.
- Hooks isolados em `tests/hooks/` ou `tests/pedido/`.
- Evitar subir múltiplos servidores; rely em `globalSetup`.

## Próximos Passos Sugeridos

1. Renomear chaves de `localStorage` de `orders.*` → `pedidos.*` com migração suave.
2. Consolidar exports públicos num único `index.js` se necessário (re-export de `orders/orders.js`).
3. Adicionar testes cobrindo fallback de paginação (resposta sem meta) se ainda não houver.
4. Documentar eventos disponíveis em `events.js`.

## Convenções Rápidas

- Evitar duplicar lógica de custo ou FIFO (localizada em `lib/fifo.js` e endpoints API).
- Sempre reutilizar `MSG` de `components/common/messages.js` para textos de interface padrão.
- Não recalcular status de documentos de parceiros aqui (responsabilidade de entidades).

Mantendo este layout unificado reduzimos atrito cognitivo e aceleramos evolução futura.
