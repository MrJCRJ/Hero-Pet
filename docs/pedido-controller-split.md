# Split do Controller de Pedido

## Visão Geral

Este documento descreve a arquitetura de divisão do controller de pedido em hooks especializados, substituindo um monólito por módulos focados e testáveis.

## Hooks do Controller

| Hook | Responsabilidade |
|------|------------------|
| `usePedidoTipoParceiro` | Tipo do pedido (VENDA/COMPRA) e seleção do parceiro (cliente/fornecedor) |
| `usePedidoItems` | Itens do pedido, quantidades, preços, desconto e cálculos por linha |
| `usePedidoPromissorias` | Parcelamento, datas e status das promissórias |
| `usePedidoTotals` | Totais gerais (bruto, desconto, líquido), frete e lucro |
| `usePedidoSideEffects` | Efeitos colaterais (sync de dados do parceiro, validações em cadeia) |
| `usePedidoPersistence` | Persistência (create/update) e submissão ao backend |
| `usePedidoFormController` | Orquestrador que compõe os hooks acima e expõe estado unificado |

## Fluxo de Dados

```
usePedidoFormController
    ├── usePedidoTipoParceiro (tipo, partnerId, partnerName)
    ├── usePedidoItems (itens, adicionar/remover, recalcular)
    ├── usePedidoPromissorias (parcelado, numeroPromissorias, datas)
    ├── usePedidoTotals (totais derivados dos itens + frete)
    ├── usePedidoSideEffects (sync, validações)
    └── usePedidoPersistence (submit, loading, error)
```

## Localização

- **Controller**: `components/pedidos/usePedidoFormController.js`
- **Hooks específicos**: `components/pedidos/usePedido*.js`
- **Form view**: `components/pedidos/PedidoFormView.js`, `PedidoForm*.js`

## Refatorações em Andamento

- Extração de sub-hooks do `usePedidoFormController` quando exceder limites de lint.
- Consolidação de lógica de orçamento/compra em `PedidoFormOrcamentoCompra.js`.
