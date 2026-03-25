# Inventário: componentes de relatórios × APIs e campos calculados

Este documento mapeia a aba **Relatórios Gerenciais** (`/relatorios`), os componentes em `app/(main)/relatorios/components/`, as rotas de API que alimentam cada visão e onde os valores são calculados (servidor vs cliente).

## Visão geral da página

| Aba | Componente | Fetch principal(s) | Cálculo no cliente |
|-----|------------|------------------|-------------------|
| Resumo | `ResumoView` | `GET /api/v1/pedidos/summary?month=…`; `GET /api/v1/relatorios/consolidado?mes&ano&format=json` (só alertas) | Alertas locais (lucro operacional negativo, margem &lt; 15% por 2 meses); formatação |
| DRE | `DREView` | `GET /api/v1/relatorios/dre?mes&ano`; `GET /api/v1/relatorios/indicadores?mes&ano` | Composição % no gráfico; `VariacaoBadge` (variação % vs mês anterior) |
| Fluxo de Caixa | `FluxoView` | `GET /api/v1/relatorios/fluxo-caixa?mes&ano`; `GET /api/v1/relatorios/indicadores?mes&ano` | Gráficos a partir de `entradas`/`saidas`/`evolucaoMensal` |
| Margem por Produto | `MargemView` | `GET /api/v1/relatorios/margem-produto?mes&ano&compare=1` | `margemMediaPonderada` ponderada por receita; fatia “Outros” no pie (top 15 vs `totalReceita`) |
| Ranking | `RankingView` | `GET /api/v1/relatorios/ranking?mes&ano&tipo&compare=1` | `concentracaoTop10`, `topRanking` participação, pie com “Outros” |
| Top Lucro | `TopLucroView` | Via página: `GET /api/v1/produtos/top?month&topN&productMonths` | Delegado a `TopProdutosRanking` |
| Histórico Custo | `HistoricocustoView` | `GET /api/v1/produtos?fields=id-nome&limit=500`; `GET /api/v1/produtos/:id/custos_historicos?months=` | — |

## Resumo (`ResumoView`)

**Payload (`/api/v1/pedidos/summary`)** — campos usados na UI (tipagem em `ResumoViewProps`):

- `vendasMes`, `lucroBrutoMes`, `lucroOperacionalMes`, `margemBrutaPerc`, `margemOperacionalPerc`
- `cogsReal`, `despesasMes`, `comprasMes`, `comprasMesAnterior`, `crescimentoComprasMoMPerc`
- `growthHistory[]`: `vendas`, `cogs`, `lucro`, `margem`, `crescimento`
- `comprasHistory[]`, `promissorias`, `topProdutoLucro`, `crescimentoMoMPerc`

**Consolidado** — apenas `alertas` (mapeados para `alertasConsolidado` na página).

**Servidor**: [`server/api/v1/pedidos/summary.ts`](../../server/api/v1/pedidos/summary.ts) (agregações).

## DRE (`DREView`)

**Payload (`/api/v1/relatorios/dre`)**:

- `periodo`: `{ mes, ano, firstDay, lastDay }`
- `dre`: `receitas`, `custosVendas`, `lucroBruto`, `despesas`, `lucroOperacional`, `margemBruta`, `margemOperacional`, `margemEbitda`, `despesasSobreReceita`, `custosSobreReceita`, `impostos`, `ebitda`, etc.
- `dreAnterior` (opcional): mesma estrutura numérica para mês anterior

**Servidor**: [`server/api/v1/relatorios/dre/index.ts`](../../server/api/v1/relatorios/dre/index.ts) — receita = `SUM(total_liquido + frete)` em VENDA confirmada; COGS em `pedido_itens`; despesas por `data_vencimento` excluindo `devolucao_capital`.

### Indicadores gerenciais (`/api/v1/relatorios/indicadores`)

Implementação: [`lib/relatorios/computeIndicadores.ts`](../../lib/relatorios/computeIndicadores.ts) (consultas SQL) + [`lib/relatorios/computeIndicadoresNumeric.ts`](../../lib/relatorios/computeIndicadoresNumeric.ts) (fórmulas testadas em unitário).

| Indicador | Fórmula (resumo) | Observação |
|-----------|------------------|------------|
| **PMR** | `(média contas a receber / vendas do período) × dias do período` | CR = promissórias de venda em aberto (snapshot em início/fim). Vendas = faturamento do período. Se vendas forem baixas e CR alto, PMR dispara. |
| **PMP** | `(média contas a pagar / compras do período) × dias do período` | CP = promissórias de compra + despesas em aberto (regras SQL). **Compras baixas no ano (ex.: 2026) com saldos altos → PMP enorme (ex.: milhares de dias)** — efeito da fórmula, não necessariamente bug. |
| **Giro** | `COGS do período / valor em estoque (instantâneo)` | Na UI aparece “×/ano”, mas o número é **razão no período**, não annualizado automaticamente. |
| **DVE** | Se giro > 0: `365 / giro`; senão `(estoque/COGS)×dias` | Mistura anual (365) com giro não anualizado; interpretar com cautela. |

Testes: [`tests/unit/lib/relatorios/computeIndicadoresNumeric.test.ts`](../../tests/unit/lib/relatorios/computeIndicadoresNumeric.test.ts), [`tests/unit/lib/relatorios/indicadoresDiasPeriodo.test.ts`](../../tests/unit/lib/relatorios/indicadoresDiasPeriodo.test.ts).

## Fluxo de Caixa (`FluxoView`)

**Payload (`/api/v1/relatorios/fluxo-caixa`)** — chaves principais consumidas:

- `saldoInicial`, `saldoFinal`, `saldo`, `entradas` (objeto com `total` e detalhes), `saidas`, `fluxoOperacional`, `fluxoFinanciamento`, `fluxoInvestimento`
- `valorEstoque`, `valorPresumidoVendaEstoque`
- `evolucaoMensal[]`: `mes`, `entradas`, `saidas`, `saldoPeriodo`, `saldoAcumulado`
- `conciliacao`, `fluxoAnterior` (comparativo)

**Servidor**: [`server/api/v1/relatorios/fluxo-caixa/index.ts`](../../server/api/v1/relatorios/fluxo-caixa/index.ts).

## Margem por produto (`MargemView`)

**Payload (`/api/v1/relatorios/margem-produto`)**:

- `itens[]`: `receita`, `cogs`, `lucro`, `margem`, `quantidade`, `participacaoVendas`, `margemContribuicaoUnit`, `nome`, `categoria`, `produto_id`
- `totalReceita` (soma das receitas retornadas no conjunto)
- `margemAnterior` (opcional)

**Servidor**: [`server/api/v1/relatorios/margem-produto/index.ts`](../../server/api/v1/relatorios/margem-produto/index.ts) — agrupamento por `produto_id`, ordenação por lucro; **limit** padrão (top N).

**UI**: `participacaoVendas` e pie “Outros” são relativos ao `totalReceita` do payload (ou soma dos itens); não confundir com faturamento global do período se houver mais produtos fora do top N.

## Ranking (`RankingView`)

**Payload (`/api/v1/relatorios/ranking`)**:

- `tipo`: `vendas` | `fornecedores`
- `ranking[]`: `entity_id`, `nome`, `pedidos_count`, `total`; em vendas: `margemBruta`, `ticketMedio`, `participacaoTotal`
- `totalGeral`, `totalPedidosGeral`, `ticketMedioGeral` (vendas)
- `rankingAnterior` (opcional): `{ totalGeral }` (comparativo ano anterior com `compare=1`)

**Servidor**: [`server/api/v1/relatorios/ranking/index.ts`](../../server/api/v1/relatorios/ranking/index.ts).

## Top Lucro (`TopLucroView`)

**Payload (`/api/v1/produtos/top`)**: `top`, `history`, `meta` — repassado a [`components/products/TopProdutosRanking`](../../components/products/TopProdutosRanking).

## Histórico de custo (`HistoricocustoView`)

Não passa pelo agregador de relatórios; custos médios por mês vêm de `/api/v1/produtos/:id/custos_historicos`.

## Relatório consolidado (download)

`GET /api/v1/relatorios/consolidado?mes&ano&format=json` — [`lib/relatorios/fetchDadosConsolidado.ts`](../../lib/relatorios/fetchDadosConsolidado.ts), `buildJsonConsolidado`, `computeAlertas`.

## Período (`getReportBounds`)

[`lib/relatorios/dateBounds.ts`](../../lib/relatorios/dateBounds.ts): `mes=0` = ano inteiro; `ano=0` = últimos 12 meses; mês específico = `[firstDay, lastDay)` com `lastDay` exclusivo.

## Autenticação

Todas as APIs acima usam `withRole`: sessão obrigatória; papel `admin` | `operador` | `visualizador` para GET.

## Automação e artefatos de QA

| Artefato | Descrição |
|----------|-----------|
| [`tests/fixtures/relatorios-golden-dataset.sql`](../../tests/fixtures/relatorios-golden-dataset.sql) | Queries de reconciliação comentadas (referência manual / staging). |
| [`tests/api/v1/relatorios/relatorios-calculos.test.js`](../../tests/api/v1/relatorios/relatorios-calculos.test.js) | Integração: DRE, ranking, margem, fluxo, consolidado e indicadores após seed (mesmo padrão de `tests/api/v1/pedidos/summary-lucro.test.js`). Requer Postgres acessível pelo Next (`GET /api/v1/status` 200). Com [`infra/compose.yaml`](../../infra/compose.yaml), a porta publicada é **5433** → ajuste `POSTGRES_PORT` no `.env` de teste. |
| [`tests/unit/lib/relatorios/dateBounds.test.ts`](../../tests/unit/lib/relatorios/dateBounds.test.ts) | Unitário: `getReportBounds` e `periodoFilename`. |
| [`tests/unit/lib/relatorios/computeIndicadoresNumeric.test.ts`](../../tests/unit/lib/relatorios/computeIndicadoresNumeric.test.ts) | Unitário: PMR, PMP, giro, DVE (inclui cenário de PMP “explosivo”). |
| [`tests/unit/lib/relatorios/indicadoresDiasPeriodo.test.ts`](../../tests/unit/lib/relatorios/indicadoresDiasPeriodo.test.ts) | Unitário: `diasPeriodo` vs `getReportBounds`. |
| [`tests/integration/relatorios/RelatoriosPage.smoke.test.tsx`](../../tests/integration/relatorios/RelatoriosPage.smoke.test.tsx) | Smoke UI: troca de abas e fetches esperados (fetch mockado). |
