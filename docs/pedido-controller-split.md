## Plano de Divisão: `usePedidoFormController.js`

Status Atual (2025-10-02 – fase 1 concluída)

O controller original (~500 linhas) foi reduzido para ~292 linhas na primeira onda de extrações. Foram criados e integrados:

- `usePedidoItens`
- `usePedidoTipoParceiro`
- `usePedidoSideEffects`
- `usePedidoTotals` (expandido com `subtotal`, `totalDescontos`, `totalLiquido`, `computeLucroPercent`)
- `usePedidoPromissorias` (já existente – mantido)

Próxima etapa opcional: Persistência futura (`usePedidoPersistence`) para avançar rumo à meta < 250 linhas (payload principal já extraído para `components/pedido/payload.js`).

Arquivo original concentrava as responsabilidades abaixo:

1. Estado primário do pedido (tipo, datas, parceiro, situação)
2. Gestão de itens (CRUD, cálculo de totais, sugestões de preço)
3. Promissórias (cronograma, bloqueios de edição, marcação de pago)
4. Totais / Resumo financeiro (lucro, margens, custo médio, impostos?)
5. Side-effects de sincronização (refetch estoque, disparo de eventos, highlight)
6. Lógica de inicialização / carregamento (prefill de edição, resets parciais)

### Objetivos da Refatoração (e status)

- Reduzir o arquivo principal para < 250 linhas. (Em progresso: 292 linhas atuais – segunda fase opcional)
- Aumentar testabilidade isolando domínios. (Concluído: novos testes unitários `usePedidoTotals` + existentes de itens)
- Evitar regressões mantendo a interface pública estável. (Concluído – integração PedidoForm permanece verde)
- Preparar extensões futuras (pagamento/persistência). (Em preparação – espaço restante para `usePedidoPersistence`)

### Arquitetura de Hooks (Estado Atual)

```
usePedidoFormController (fachada)
  ├─ usePedidoTipoParceiro           (implementado)
  ├─ usePedidoItens                  (implementado)
  ├─ usePedidoPromissorias           (existente / integrado)
  ├─ usePedidoTotals                 (implementado + expandido: subtotal, totalDescontos, totalLiquido, lucro%, lucro bruto)
  ├─ usePedidoSideEffects            (implementado: temNotaFiscal policy + saldo sync)
  └─ usePedidoPersistence (futuro)   (pendente – não prioritário)
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

### API de Totais (Nova)

`usePedidoTotals` agora expõe:

```
{
  computeItemTotal(it),
  subtotal(),            // soma dos itens após desconto unitário aplicado em cada item
  totalDescontos(),      // soma (quantidade * desconto_unitario) por item
  totalLiquido(),        // subtotal - totalDescontos (+ frete se COMPRA)
  computeOrderTotalEstimate(), // alias de totalLiquido()
  computeLucroBruto(),
  computeLucroPercent(),
}
```

Testes cobrindo cenários:

- desconto aplicado (subtotal/totalDescontos/totalLiquido)
- lucro negativo (lucro % negativo)
- COMPRA com frete (frete somado apenas em COMPRA)

### Payload Helper

O antigo builder inline `buildPayloadBase` foi movido para `components/pedido/payload.js` como `buildPedidoPayloadBase`, reduzindo ~5 linhas diretas e concentrando regra em um único lugar. Benefícios:

- Facilita futura reutilização por `usePedidoPersistence` ou rotinas de autosave.
- Mantém controller focado em orquestração e não em montagem de estruturas.
- Permite validar payload em testes isolados (planejado para fase 2, se necessário).

Contrato do helper:

```ts
buildPedidoPayloadBase({
  partnerId, partnerName, observacao, dataEmissao, dataEntrega,
  temNotaFiscal, parcelado, numeroPromissorias, dataPrimeiraPromissoria,
  promissoriaDatas, itens, freteTotal, tipo
}) => PedidoPayloadBase
```

### Divergência Promissórias (Planejado)

Ainda não validamos divergência entre `valor_por_promissoria * numero_promissorias` e `totalLiquido()`. Próximos passos planejados para quando persistência for introduzida:

1. Adicionar derivação `sumPromissorias` em `usePedidoPromissorias`.
2. Expor flag `hasScheduleMismatch = Math.abs(sumPromissorias - totalLiquido()) > 0.009`.
3. UI: Exibir badge de alerta e sugestão de recalcular ou ajustar última parcela.
4. Teste: placeholder atual (skipped) será ativado cobrindo criação manual + alteração de item.

### Divisão Detalhada (Planejamento Original)

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

### Testes (Status)

- `usePedidoTotals.test.js` implementado (desconto, frete compra, lucro negativo).
- Teste unitário específico de itens: (parcial – validar se necessário expandir para cobertura de regressão futura).
- Integrações do PedidoForm permanecem verdes (ver execução de suíte após segunda fase quando adicionarmos persistence).
- Pendentes futuros: cenário custo zero e divergência promissórias vs total (agendar na fase Persistence).

### Riscos e Mitigações

| Risco                                                            | Mitigação                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Quebra em cálculo de totais                                      | Snapshot numérico antes/depois, testes unitários de `usePedidoTotals`    |
| Eventos disparados em duplicidade                                | Centralizar side-effects em único hook + flag de guarda                  |
| Ordem de inicialização (promissórias dependem de itens iniciais) | Sequenciar composição: itens -> promissórias -> totals                   |
| Regressão em highlight deep-link                                 | Preservar lógica atual intacta dentro de `usePedidoSideEffects` primeiro |

### Critério de Conclusão (Atualizado)

Fase 1 (Concluída):

- Controller < 300 linhas (292) ✅
- Hooks de domínio criados e integrados ✅
- Totais expandidos + testes unitários ✅
- Documentação atualizada ✅

Fase 2 (Opcional / Futuro):

- Reduzir para < 250 linhas extraindo persistence e helpers adicionais ⏳
- Adicionar testes extras (divergência promissórias) ⏳
- Introduzir `usePedidoPersistence` (auto-save/rascunho) ⏳

---

Data plano: 2025-10-02
Responsável: Refactor Initiative

### Auto-Save / Persistência (Fase 2 Implementada Parcialmente)

Foi introduzido o hook `usePedidoPersistence` para unificar create/update/delete e habilitar auto-save simples.

Características atuais:

- Debounce: 2000ms (2s) – evita disparos excessivos enquanto o usuário digita.
- Escopo: somente em modo edição (`isEdit = true`). Novos pedidos não são auto-salvos até primeiro submit (reduz risco de criar rascunhos inválidos no backend).
- Trigger: Qualquer mudança em campos chave (tipo, datas, parceiro, promissórias, itens, frete, flags).
- Tolerância a erros: silenciosa (falha de auto-save não interrompe a interação; futuro callback pode surfacear estado).
- Toast opcional: controlado por flag `showAutoSaveToast` (default `false`) para evitar ruído constante visual em sessões normais.

Recomendação de Uso da Flag:

- Ativar (true) apenas em sessões de QA, debug de inconsistências ou quando intencionalmente avaliando comportamento de persistência em tempo real.
- Manter desativada em produção para não poluir a experiência (toasts a cada alteração podem gerar fadiga).

API Resumida (`usePedidoPersistence`):

```ts
usePedidoPersistence({
  editingOrder,
  tipo, partnerId, partnerName,
  observacao, dataEmissao, dataEntrega,
  temNotaFiscal, parcelado,
  numeroPromissorias, dataPrimeiraPromissoria, promissoriaDatas,
  itens, freteTotal, migrarFifo,
  setCreated, push, onSaved, onCreated, setSubmitting,
  showAutoSaveToast = false,
}) => { handleSubmit, handleDelete }
```

Futura Melhoria Planejada:

- Callback `onAutoSave(status)` onde `status` poderia ser `{ phase: 'started' | 'success' | 'error', at: Date }` para permitir UI discreta (ex: ícone pulsante / ponto verde) em vez de toasts.
- Estado incremental de dirty granular (ex: `dirty.promissorias`, `dirty.itens`) para evitar persistências completas quando só metadados mudaram.

Critérios Futuramente Considerados:

- Cancelamento programático (ex: ao navegar para outro módulo antes do debounce finalizar).
- Retry exponencial opcional em conexões intermitentes.
- Gate para não salvar se nenhum campo relevante modificou valor semântico (normalização de whitespace etc.).

Riscos & Mitigações:

| Risco                                                  | Mitigação                                              |
| ------------------------------------------------------ | ------------------------------------------------------ |
| Flood de requests em digitação rápida                  | Debounce 2s + considerar batching futuro               |
| Estado inconsistente se backend falhar silenciosamente | Introduzir `onAutoSave` + badge deferido               |
| Confusão usuário sobre "quando salvou"                 | UI discreta futura + histórico de autosave (timestamp) |

Status: Parcial (create/update/delete centralizado + auto-save básico). Extensões listadas aguardam priorização.
