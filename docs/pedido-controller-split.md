## Plano de Divisão: `usePedidoFormController.js`

Arquivo atual (~500 linhas) concentra múltiplas responsabilidades:

1. Estado primário do pedido (tipo, datas, parceiro, situação)
2. Gestão de itens (CRUD, cálculo de totais, sugestões de preço)
3. Promissórias (cronograma, bloqueios de edição, marcação de pago)
4. Totais / Resumo financeiro (lucro, margens, custo médio, impostos?)
5. Side-effects de sincronização (refetch estoque, disparo de eventos, highlight)
6. Lógica de inicialização / carregamento (prefill de edição, resets parciais)

### Objetivos da Refatoração

- Reduzir o arquivo principal para < 250 linhas.
- Aumentar testabilidade isolando domínios.
- Evitar regressões: interface externa (API do hook principal exposto ao form) permanece estável.
- Preparar para futuras extensões (ex.: condições especiais de pagamento, múltiplos parceiros) sem inflar o core.

### Nova Arquitetura de Hooks

```
usePedidoFormController (fachada)
  ├─ usePedidoTipoParceiro           (tipo=VENDA|COMPRA, parceiro seleção, reset relacionando)
  ├─ usePedidoItens                  (lista itens, add/remove/update, diff, validações, cálculo custo parcial)
  ├─ usePedidoPromissorias           (já extraído parcialmente: gerar/editar/lock + sincronização cronograma)
  ├─ usePedidoTotals                 (derivados: subtotal, descontos, lucro, margem; memo + dependências claras)
  ├─ usePedidoSideEffects            (efeitos cruzados: refresh estoque após item add/remove, eventos window, highlight)
  └─ usePedidoPersistence (futuro)   (salvar rascunho/localStorage ou auto-save opcional)
```

### Contrato Externo (Mantido)

O form continuará importando algo como:

```js
const controller = usePedidoFormController({ initial, mode });
// controller expõe:
//  - state: itens, parceiro, tipo, promissorias, totais
//  - actions: addItem, updateItem, removeItem, generateSchedule, markParcelaPaga, setTipo, setParceiro, submit
//  - meta: loading, saving, errors, dirtyFlags
```

### Divisão Detalhada

#### 1. `usePedidoTipoParceiro`

Responsável por:

- tipo do pedido (VENDA|COMPRA) e transições
- parceiro (cliente/fornecedor) + efeitos de limpeza ao trocar tipo/parceiro
- validações simples (ex: VENDA exige cliente; COMPRA exige fornecedor PJ para certos fluxos)

API proposta:

```ts
{
  (tipo, setTipo, parceiro, setParceiro, resetParceiroSeInvalido);
}
```

#### 2. `usePedidoItens`

Responsável por:

- lista de itens (estado + operações)
- normalização de campos (números, descontos)
- cálculo de custo agregado (para feed de totals)
- integração com quick-add (sem import circular)

API proposta:

```ts
{
  (itens,
    addItem,
    updateItem,
    removeItem,
    clearItens,
    totalBruto,
    totalDescontos,
    totalLiquido,
    lucroParcial);
}
```

#### 3. `usePedidoPromissorias`

Já existe `usePromissoriasSchedule`. Nova camada adaptadora:

- Coordena schedule + interação com totals (ex: total esperado vs soma parcelas)
- Exposição unificada: `{ promissorias, gerar, atualizar, marcarPaga, travarManual, recalcular }`

#### 4. `usePedidoTotals`

Responsável por derivar:

- subtotal (itens)
- descontos
- custo total (se disponível)
- lucro absoluto + margem (%)
- flags (lucroNegativo, margemAbaixoEsperado)

Entrada: projeção mínima de dados `itens`, `promissorias`, talvez `tipo`.
Saída memoizada para minimizar renders.

#### 5. `usePedidoSideEffects`

Responsável por efeitos que dependem de múltiplos domínios:

- disparar evento `inventory-changed` pós submit ou alteração significativa
- sincronizar highlight inicial (se houver ?highlight)
- watchers para recalcular schedule quando tipo muda (se aplicável)

API proposta:

```ts
usePedidoSideEffects({ itens, tipo, parceiro, promissorias, refreshEstoque });
```

### Passos de Implementação (Iterações)

1. Extrair `usePedidoItens` (mínimo risco, dependência pequena) + testes focused (add/remove/update) via unidade simples.
2. Introduzir `usePedidoTotals` consumindo saída de itens (validar com testes existentes de resumo de lucro).
3. Adaptar `usePromissoriasSchedule` para ser embrulhado por `usePedidoPromissorias` (expor API consolidada) – manter testes atuais.
4. Extrair `usePedidoTipoParceiro` e ajustar pontos de uso (testar alternância VENDA↔COMPRA em integração).
5. Criar `usePedidoSideEffects` movendo efeitos do controller original (verificar não duplicação de eventos).
6. Reescrever `usePedidoFormController` como composição orquestradora das camadas acima; manter shape público.
7. Remover código legado e atualizar documentação (`CODE_STYLE.md` seção Forms / Pedido).

### Testes Necessários

- Unidade: `usePedidoItens` (add item, update qty/preço, remove, totalBruto, totalLiquido).
- Unidade: `usePedidoTotals` (margem e lucro com cenários: desconto, sem desconto, custo zero, margem negativa).
- Integração existente `PedidoForm.refactor.integration.test.js` deve permanecer verde (garantir comportamento macro).
- Novo teste focado promissórias + itens alterando subtotal para garantir recalculo de divergência.

### Riscos e Mitigações

| Risco                                                            | Mitigação                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Quebra em cálculo de totais                                      | Snapshot numérico antes/depois, testes unitários de `usePedidoTotals`    |
| Eventos disparados em duplicidade                                | Centralizar side-effects em único hook + flag de guarda                  |
| Ordem de inicialização (promissórias dependem de itens iniciais) | Sequenciar composição: itens -> promissórias -> totals                   |
| Regressão em highlight deep-link                                 | Preservar lógica atual intacta dentro de `usePedidoSideEffects` primeiro |

### Critério de Conclusão

- Arquivo original reduzido < 250 linhas
- Todos testes existentes + novos passando
- Lint de componentes sem warnings adicionais
- Documentação atualizada

---

Data plano: 2025-10-02
Responsável: Refactor Initiative
