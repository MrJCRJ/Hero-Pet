/**
 * Exporta o relatório consolidado em JSON estruturado (snake_case).
 * Schema versionado para evolução futura sem quebrar integrações.
 */

import type { PayloadConsolidado } from "@/lib/relatorios/fetchDadosConsolidado";
import type { Alerta } from "@/lib/relatorios/computeAlertas";
import type { DreMesRow } from "@/lib/relatorios/fetchDreMesAMes";
import { EMITENTE } from "@/lib/constants/company";

export interface RespostaConsolidado extends PayloadConsolidado {
  alertas?: Alerta[];
}

function ensureNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function periodoTipo(mes: number, ano: number): string {
  if (ano === 0) return "Últimos 12 meses";
  if (mes === 0 || !mes) return `Ano ${ano}`;
  return `Mês ${ano}-${String(mes).padStart(2, "0")}`;
}

function dreMesRowSnake(row: DreMesRow): Record<string, unknown> {
  return {
    mes: row.mes || null,
    periodo_inicio: row.periodo_inicio || null,
    periodo_fim_exclusivo: row.periodo_fim_exclusivo || null,
    receitas: ensureNumber(row.receitas),
    custos_vendas: ensureNumber(row.custos_vendas),
    despesas: ensureNumber(row.despesas),
    lucro_bruto: ensureNumber(row.lucro_bruto),
    lucro_operacional: ensureNumber(row.lucro_operacional),
    margem_bruta_pct: ensureNumber(row.margem_bruta_pct),
    margem_operacional_pct: ensureNumber(row.margem_operacional_pct),
  };
}

export function buildJsonConsolidado(resposta: RespostaConsolidado): Record<string, unknown> {
  const {
    periodo,
    dre,
    fluxo,
    indicadores,
    margem,
    ranking,
    cenarioLiquidacao,
    alertas = [],
    serieDreMensal,
  } = resposta;

  const periodoObj = {
    inicio: periodo.firstDay,
    fim: periodo.lastDay,
    tipo: periodoTipo(periodo.mes, periodo.ano),
  };

  const resumo = {
    saldo_caixa: ensureNumber(fluxo.saldoFinal),
    fluxo_operacional: ensureNumber(fluxo.fluxoOperacional),
    margem_bruta: ensureNumber(dre.margemBruta),
    margem_operacional: ensureNumber(dre.margemOperacional),
    lucro_bruto: ensureNumber(dre.lucroBruto),
    lucro_operacional: ensureNumber(dre.lucroOperacional),
  };

  const alertasJson = alertas.map((a) => ({
    id: a.id,
    tipo: a.tipo,
    msg: a.msg,
    ...(a.valorAtual != null && { valor_atual: typeof a.valorAtual === "number" ? a.valorAtual : a.valorAtual }),
    ...(a.referencia != null && { referencia: a.referencia }),
    ...(a.acaoSugerida != null && { acao_sugerida: a.acaoSugerida }),
  }));

  const dreJson = {
    receitas: ensureNumber(dre.receitas),
    custos_vendas: ensureNumber(dre.custosVendas),
    lucro_bruto: ensureNumber(dre.lucroBruto),
    despesas: ensureNumber(dre.despesas),
    impostos: ensureNumber(dre.impostos),
    lucro_operacional: ensureNumber(dre.lucroOperacional),
    ebitda: ensureNumber(dre.ebitda),
    margem_bruta: ensureNumber(dre.margemBruta),
    margem_operacional: ensureNumber(dre.margemOperacional),
  };

  const fluxoCaixa = {
    entradas: {
      vendas: ensureNumber(fluxo.entradas.vendas),
      promissorias_recebidas: ensureNumber(fluxo.entradas.promissoriasRecebidas),
      aportes_capital: ensureNumber(fluxo.entradas.aportesCapital),
      total: ensureNumber(fluxo.entradas.total),
    },
    saidas: {
      compras: ensureNumber(fluxo.saidas.compras),
      despesas: ensureNumber(fluxo.saidas.despesas),
      devolucao_capital: ensureNumber(fluxo.saidas.devolucao_capital ?? 0),
      total: ensureNumber(fluxo.saidas.total),
    },
    saldo_inicial: ensureNumber(fluxo.saldoInicial),
    saldo_final: ensureNumber(fluxo.saldoFinal),
    evolucao_mensal: fluxo.evolucaoMensal.map((e) => ({
      mes: String(e.mes),
      entradas: ensureNumber(e.entradas),
      saidas: ensureNumber(e.saidas),
      saldo_acumulado: ensureNumber(e.saldoAcumulado),
    })),
  };

  const indicadoresJson = {
    pmr: indicadores?.pmr ?? null,
    pmp: indicadores?.pmp ?? null,
    dve: indicadores?.dve ?? null,
    giro_estoque: indicadores?.giroEstoque ?? null,
  };

  const margemProduto = margem.itens.map((item) => ({
    produto_id: typeof item.produto_id === "number" ? item.produto_id : Number(item.produto_id) || 0,
    nome: String(item.nome ?? ""),
    receita: ensureNumber(item.receita),
    cogs: ensureNumber(item.cogs),
    lucro: ensureNumber(item.lucro),
    margem: ensureNumber(item.margem),
    participacao_vendas: ensureNumber(item.participacaoVendas),
  }));

  const rankingClientes = ranking.itens.map((c) => ({
    entity_id: typeof c.entity_id === "number" ? c.entity_id : Number(c.entity_id) || 0,
    nome: String(c.nome ?? ""),
    total: ensureNumber(c.total),
    margem_bruta: c.margemBruta,
  }));

  let cenarioLiquidacaoJson: Record<string, unknown>;
  if (!cenarioLiquidacao) {
    cenarioLiquidacaoJson = { erro: "Dados do cenário de liquidação indisponíveis" };
  } else if (cenarioLiquidacao.erro) {
    cenarioLiquidacaoJson = {
      erro: cenarioLiquidacao.erro,
    };
  } else {
    cenarioLiquidacaoJson = {
      saldo_caixa_atual: ensureNumber(cenarioLiquidacao.saldoCaixaAtual),
      valor_venda_estoque_bruto: ensureNumber(cenarioLiquidacao.valorPresumidoVendaBruto),
      comissao_percentual: ensureNumber(cenarioLiquidacao.comissaoPct),
      comissao_valor: ensureNumber(cenarioLiquidacao.comissaoValor),
      venda_liquida_estoque: ensureNumber(cenarioLiquidacao.vendaLiquidaEstoque),
      promissorias_a_receber: ensureNumber(cenarioLiquidacao.promissoriasAReceber),
      total_disponivel: ensureNumber(cenarioLiquidacao.disponivelTotal),
      saldo_a_devolver_socios: ensureNumber(cenarioLiquidacao.saldoDevolverSocios),
      resultado_final: ensureNumber(cenarioLiquidacao.resultadoFinal),
    };
  }

  const serieDreMensalJson =
    serieDreMensal != null
      ? {
          tipo: serieDreMensal.tipo,
          intervalo_coberto: {
            inicio: serieDreMensal.intervalo.inicio,
            fim_exclusivo: serieDreMensal.intervalo.fim_exclusivo,
          },
          meses: serieDreMensal.meses.map(dreMesRowSnake),
          totais_soma_dos_meses: {
            descricao:
              "Soma aritmética dos meses acima; lucros e margens recalculados sobre os totais (não soma das margens mensais).",
            ...dreMesRowSnake(serieDreMensal.totais_soma_meses),
          },
        }
      : undefined;

  return {
    schema_version: "1.1",
    empresa: EMITENTE.razao,
    escopo_relatorio: {
      periodo_filtro_interativo: periodoObj,
      explicacao:
        "Os blocos dre, fluxo_caixa, resumo, indicadores, margem_produto e ranking_clientes referem-se exclusivamente ao periodo_filtro_interativo (o mesmo filtro da tela). " +
        "A chave serie_dre_mensal traz, em paralelo, a DRE mês a mês no ano civil completo (quando há ano selecionado) ou na janela dos últimos 12 meses (quando ano = 'últimos 12 meses'), com totais agregados.",
    },
    periodo: periodoObj,
    data_geracao: new Date().toISOString(),
    resumo: resumo,
    alertas: alertasJson,
    dre: dreJson,
    fluxo_caixa: fluxoCaixa,
    indicadores: indicadoresJson,
    margem_produto: margemProduto,
    ranking_clientes: rankingClientes,
    cenario_liquidacao: cenarioLiquidacaoJson,
    ...(serieDreMensalJson ? { serie_dre_mensal: serieDreMensalJson } : {}),
  };
}
