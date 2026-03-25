import database from "infra/database.js";
import { getReportBounds } from "@/lib/relatorios/dateBounds";
import { computeIndicadores } from "@/lib/relatorios/computeIndicadores";
import type { DadosParaAlertas } from "@/lib/relatorios/computeAlertas";
import { computeCenarioLiquidacao, getConfigLiquidacao } from "@/lib/relatorios/computeCenarioLiquidacao";
import { computeSaldoDevolverSocios } from "@/lib/relatorios/computeSaldoDevolverSocios";
import {
  fetchDreMesAMes,
  somarDreMeses,
  type DreMesRow,
} from "@/lib/relatorios/fetchDreMesAMes";
import { fetchContasReceberAgingPorCliente, type AgingTotais, type AgingClienteRow } from "@/lib/relatorios/fetchContasReceberAging";
import { fetchFretePeriodo, type FretePeriodoResult } from "@/lib/relatorios/fetchFretePeriodo";
import { fetchComprasPorFornecedor, type CompraFornecedorRow } from "@/lib/relatorios/fetchComprasPorFornecedor";
import { fetchComparativoInteranual, type ComparativoYoYMes } from "@/lib/relatorios/fetchComparativoYoY";
import { enrichSerieComMediasMoveis, type DreMesComMedias } from "@/lib/relatorios/enrichSerieDreMensal";
import type { IndicadoresDerivadosBi } from "@/lib/relatorios/computeIndicadoresDerivadosBi";
import { buildIndicadoresConsolidados } from "@/lib/relatorios/buildIndicadoresConsolidados";
import {
  fetchMargemLiquidaPorClienteEstimado,
  type MargemLiquidaPorClienteEstimado,
} from "@/lib/relatorios/fetchMargemLiquidaPorClienteEstimado";
import { fetchMetasMensais, type MetaMensalRow } from "@/lib/relatorios/fetchMetasMensais";

export interface PayloadConsolidado {
  periodo: { mes: number; ano: number; firstDay: string; lastDay: string };
  dre: {
    receitas: number;
    receitaBruta: number;
    receitaLiquida: number;
    custosVendas: number;
    lucroBruto: number;
    despesas: number;
    impostos: number;
    lucroOperacional: number;
    ebitda: number;
    margemBruta: number;
    margemOperacional: number;
  };
  fluxo: {
    saldoInicial: number;
    saldoFinal: number;
    entradas: { vendas: number; promissoriasRecebidas: number; aportesCapital: number; total: number };
    saidas: { compras: number; despesas: number; devolucao_capital: number; total: number };
    saldo: number;
    fluxoOperacional: number;
    evolucaoMensal: Array<{ mes: string; entradas: number; saidas: number; saldoPeriodo: number; saldoAcumulado: number }>;
    conciliacao?: Record<string, number>;
  };
  indicadores: { pmr: number | null; pmp: number | null; giroEstoque: number | null; dve: number | null };
  margem: {
    itens: Array<{
      produto_id: string | number;
      nome: string;
      receita: number;
      cogs: number;
      lucro: number;
      margem: number;
      participacaoVendas: number;
    }>;
    totalReceita: number;
    margemMediaPonderada: number;
  };
  ranking: {
    itens: Array<{
      entity_id: string | number;
      nome: string;
      total: number;
      margemBruta: number | null;
      pedidos_count?: number;
      ticketMedio?: number;
      participacaoTotal?: number;
    }>;
    totalGeral: number;
  };
  dreAnterior?: { receitas: number; lucroOperacional: number; margemBruta: number };
  margemAnterior?: { totalReceita: number; margemMediaPonderada: number };
  rankingAnterior?: { totalGeral: number };
  cenarioLiquidacao?: import("@/lib/relatorios/computeCenarioLiquidacao").CenarioLiquidacaoResult & { erro?: string };
  /** DRE mês a mês (dados brutos) + totais do intervalo; independente do filtro da tela quando ano > 0 (ano civil). */
  serieDreMensal?: {
    tipo: string;
    intervalo: { inicio: string; fim_exclusivo: string };
    meses: DreMesRow[];
    totais_soma_meses: DreMesRow;
    meses_com_medias?: DreMesComMedias[];
    /** Último mês do intervalo com receitas > 0. Ajuda a interpretar meses zerados no ano civil. */
    ultimo_mes_com_dados?: string | null;
    /** Quantidade de meses do intervalo com receitas = 0. */
    qtd_meses_sem_dados?: number;
    /** Lista (limitada) dos meses com receitas = 0. */
    meses_com_zero?: string[];
  };
  contasReceberAgingPorCliente?: { clientes: AgingClienteRow[]; totais: AgingTotais };
  fretePeriodo?: FretePeriodoResult;
  comprasPorFornecedor?: CompraFornecedorRow[];
  comparativoInteranual?: { meses: ComparativoYoYMes[] } | null;
  indicadoresDerivadosBi?: IndicadoresDerivadosBi;
  margemLiquidaPorClienteEstimado?: MargemLiquidaPorClienteEstimado;
  metas?: {
    periodo: { inicio: string; fim_exclusivo: string; tipo: string };
    receita_meta: number;
    lucro_operacional_meta: number;
    margem_operacional_meta: number | null;
    receita_realizado: number;
    lucro_operacional_realizado: number;
    margem_operacional_realizado: number;
    atingimento_receita_pct: number | null;
    atingimento_lucro_operacional_pct: number | null;
    variacao_receita_pct: number | null;
    variacao_lucro_operacional_pct: number | null;
    meses_meta_count: number;
  };
}

function listMesesNoIntervalo(firstDay: string, lastDay: string): Array<{ ano: number; mes: number }> {
  const start = new Date(firstDay);
  const end = new Date(lastDay);
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const out: Array<{ ano: number; mes: number }> = [];
  while (cur < end) {
    out.push({ ano: cur.getFullYear(), mes: cur.getMonth() + 1 });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

export async function fetchDadosConsolidado(mes: number, ano: number): Promise<PayloadConsolidado> {
  const { firstDay, lastDay } = getReportBounds(mes, ano);

  const serieDreMensalPromise: Promise<PayloadConsolidado["serieDreMensal"]> =
    ano > 0
      ? (async () => {
          const yIni = `${ano}-01-01`;
          const yFim = `${ano + 1}-01-01`;
          const meses = await fetchDreMesAMes(yIni, yFim);
          const ultimoMesComDados =
            [...meses].reverse().find((m) => m.receitas > 0)?.mes ?? null;
          const qtdMesesSemDados = meses.filter((m) => m.receitas === 0).length;
          const mesesComZero = meses.filter((m) => m.receitas === 0).map((m) => m.mes);
          return {
            tipo: `ano_calendario_${ano}`,
            intervalo: { inicio: yIni, fim_exclusivo: yFim },
            meses,
            totais_soma_meses: somarDreMeses(meses),
            ultimo_mes_com_dados: ultimoMesComDados,
            qtd_meses_sem_dados: qtdMesesSemDados,
            meses_com_zero: mesesComZero,
          };
        })()
      : (async () => {
          const { firstDay: f12, lastDay: l12 } = getReportBounds(1, 0);
          const meses = await fetchDreMesAMes(f12, l12);
          const ultimoMesComDados =
            [...meses].reverse().find((m) => m.receitas > 0)?.mes ?? null;
          const qtdMesesSemDados = meses.filter((m) => m.receitas === 0).length;
          const mesesComZero = meses.filter((m) => m.receitas === 0).map((m) => m.mes);
          return {
            tipo: "ultimos_12_meses",
            intervalo: { inicio: f12, fim_exclusivo: l12 },
            meses,
            totais_soma_meses: somarDreMeses(meses),
            ultimo_mes_com_dados: ultimoMesComDados,
            qtd_meses_sem_dados: qtdMesesSemDados,
            meses_com_zero: mesesComZero,
          };
        })();

  const [
    vendasR,
    cogsR,
    despesasR,
    freteCustoPeriodoR,
    entAntR,
    promAntR,
    aportAntR,
    compAntR,
    despAntR,
    vendasR2,
    promPagosR,
    aportesR,
    comprasR,
    despesasR2,
    evolucaoMensalR,
    margemR,
    rankingR,
    totalGeralR,
    estoqueVendaR,
    promissoriasAReceberR,
    serieDreMensal,
  ] = await Promise.all([
    database.query({
      text: `SELECT COALESCE(SUM(total_liquido),0)::numeric(14,2) AS total
             FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
             AND data_emissao >= $1 AND data_emissao < $2`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
             FROM pedido_itens i JOIN pedidos p ON p.id = i.pedido_id
             WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
             AND p.data_emissao >= $1 AND p.data_emissao < $2`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
             FROM despesas
             WHERE data_vencimento >= $1 AND data_vencimento < $2
             AND (categoria IS NULL OR categoria::text != 'devolucao_capital')`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `SELECT COALESCE(SUM(COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `SELECT COALESCE(SUM(total_liquido),0)::numeric(14,2) AS total
             FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado' AND data_emissao < $1
             AND (parcelado = false OR parcelado IS NULL)`,
      values: [firstDay],
    }),
    database.query({
      text: `SELECT COALESCE(SUM(pp.amount),0)::numeric(14,2) AS total FROM pedido_promissorias pp
             JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'
             WHERE pp.paid_at IS NOT NULL AND pp.paid_at < $1::date`,
      values: [firstDay],
    }),
    database.query({ text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total FROM aportes_capital WHERE data < $1::date`, values: [firstDay] }).catch(() => ({ rows: [{ total: 0 }] })),
    database.query({
      text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos WHERE tipo = 'COMPRA' AND status = 'confirmado' AND data_emissao < $1`,
      values: [firstDay],
    }),
    database.query({ text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total FROM despesas WHERE data_vencimento < $1`, values: [firstDay] }),
    database.query({
      text: `SELECT COALESCE(SUM(total_liquido),0)::numeric(14,2) AS total
             FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
             AND data_emissao >= $1 AND data_emissao < $2 AND (parcelado = false OR parcelado IS NULL)`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `SELECT COALESCE(SUM(CASE WHEN pp.paid_at IS NOT NULL AND pp.paid_at >= $1::date AND pp.paid_at < $2::date THEN pp.amount ELSE 0 END),0)::numeric(14,2) AS total
             FROM pedido_promissorias pp JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'`,
      values: [firstDay, lastDay],
    }),
    database.query({ text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total FROM aportes_capital WHERE data >= $1::date AND data < $2::date`, values: [firstDay, lastDay] }).catch(() => ({ rows: [{ total: 0 }] })),
    database.query({
      text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos WHERE tipo = 'COMPRA' AND status = 'confirmado'
             AND data_emissao >= $1 AND data_emissao < $2`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `SELECT
               COALESCE(SUM(CASE WHEN categoria::text = 'devolucao_capital' THEN valor ELSE 0 END),0)::numeric(14,2) AS devolucao,
               COALESCE(SUM(CASE WHEN categoria IS NULL OR categoria::text != 'devolucao_capital' THEN valor ELSE 0 END),0)::numeric(14,2) AS operacionais
             FROM despesas
             WHERE data_vencimento >= $1 AND data_vencimento < $2`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `WITH series AS (
               SELECT generate_series(date_trunc('month',$1::date)::timestamp,
                 date_trunc('month',$2::date)::timestamp, interval '1 month') AS mstart
             )
             SELECT to_char(s.mstart, 'YYYY-MM') AS mes,
              (SELECT COALESCE(SUM(total_liquido),0) FROM pedidos
                WHERE tipo='VENDA' AND status='confirmado' AND data_emissao >= s.mstart AND data_emissao < s.mstart + interval '1 month'
                AND (parcelado = false OR parcelado IS NULL))::numeric(14,2) +
               (SELECT COALESCE(SUM(pp.amount),0) FROM pedido_promissorias pp JOIN pedidos p ON p.id=pp.pedido_id AND p.tipo='VENDA'
                WHERE pp.paid_at >= s.mstart AND pp.paid_at < s.mstart + interval '1 month')::numeric(14,2) +
               COALESCE((SELECT SUM(valor) FROM aportes_capital WHERE data >= s.mstart AND data < s.mstart + interval '1 month'),0)::numeric(14,2) AS entradas,
               (SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0) FROM pedidos
                WHERE tipo='COMPRA' AND status='confirmado' AND data_emissao >= s.mstart AND data_emissao < s.mstart + interval '1 month')::numeric(14,2) +
               COALESCE((SELECT SUM(valor) FROM despesas WHERE data_vencimento >= s.mstart AND data_vencimento < s.mstart + interval '1 month'),0)::numeric(14,2) +
               (SELECT COALESCE(SUM(COALESCE(p.frete_total,0)),0) FROM pedidos p
                WHERE p.tipo='VENDA' AND p.status='confirmado' AND p.data_emissao >= s.mstart AND p.data_emissao < s.mstart + interval '1 month'
                  AND (p.parcelado = false OR p.parcelado IS NULL))::numeric(14,2) AS saidas
             FROM series s ORDER BY s.mstart`,
      values: [firstDay, lastDay],
    }).catch(() => ({ rows: [] })),
    database.query({
      text: `SELECT i.produto_id, MAX(p.nome) AS nome, COALESCE(SUM(i.total_item),0)::numeric(14,2) AS receita,
             COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs,
             (COALESCE(SUM(i.total_item),0) - COALESCE(SUM(i.custo_total_item),0))::numeric(14,2) AS lucro
             FROM pedido_itens i JOIN pedidos pdr ON pdr.id = i.pedido_id JOIN produtos p ON p.id = i.produto_id
             WHERE pdr.tipo = 'VENDA' AND pdr.status = 'confirmado' AND pdr.data_emissao >= $1 AND pdr.data_emissao < $2
             GROUP BY i.produto_id HAVING COALESCE(SUM(i.total_item),0) > 0
             ORDER BY lucro DESC, receita DESC LIMIT 50`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `WITH totais_por_entity AS (
              SELECT p.partner_entity_id,
                COUNT(DISTINCT p.id)::int AS pedidos_count,
                COALESCE(SUM(p.total_liquido),0)::numeric(14,2) AS total
               FROM pedidos p WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
               AND p.data_emissao >= $1 AND p.data_emissao < $2 AND p.partner_entity_id IS NOT NULL
               GROUP BY p.partner_entity_id
             ),
             cogs_por_entity AS (
               SELECT p.partner_entity_id, COALESCE(SUM(pi.custo_total_item),0)::numeric(14,2) AS cogs
               FROM pedido_itens pi JOIN pedidos p ON p.id = pi.pedido_id
               WHERE p.tipo = 'VENDA' AND p.status = 'confirmado' AND p.data_emissao >= $1 AND p.data_emissao < $2
               GROUP BY p.partner_entity_id
             )
            SELECT e.id AS entity_id, COALESCE(NULLIF(TRIM(MAX(p.partner_name)), ''), e.name) AS nome,
              t.pedidos_count, t.total, COALESCE(c.cogs, 0)::numeric(14,2) AS cogs
             FROM entities e JOIN totais_por_entity t ON t.partner_entity_id = e.id
             LEFT JOIN cogs_por_entity c ON c.partner_entity_id = e.id
             LEFT JOIN pedidos p ON p.partner_entity_id = e.id AND p.tipo = 'VENDA' AND p.status = 'confirmado'
               AND p.data_emissao >= $1 AND p.data_emissao < $2
            GROUP BY e.id, e.name, t.pedidos_count, t.total, c.cogs ORDER BY t.total DESC LIMIT 15`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `SELECT COALESCE(SUM(p.total_liquido),0)::numeric(14,2) AS total
             FROM pedidos p WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
             AND p.data_emissao >= $1 AND p.data_emissao < $2`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `SELECT COALESCE(SUM(saldo * preco_venda), 0)::numeric(14,2) AS total
             FROM (
               SELECT p.id,
                 COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE m.quantidade END), 0)::numeric(14,3) AS saldo,
                 COALESCE(
                   NULLIF(p.preco_tabela, 0),
                   (SELECT COALESCE(SUM(valor_total),0)/NULLIF(SUM(quantidade),0) FROM movimento_estoque me WHERE me.produto_id = p.id AND me.tipo = 'ENTRADA')::numeric(14,2) * 1.2,
                   0
                 )::numeric(14,2) AS preco_venda
               FROM produtos p
               LEFT JOIN movimento_estoque m ON m.produto_id = p.id
               WHERE p.ativo = true
               GROUP BY p.id, p.preco_tabela
             ) sub
             WHERE saldo > 0`,
    }).catch(() => ({ rows: [{ total: 0 }] })),
    database.query({
      text: `SELECT COALESCE(SUM(pp.amount),0)::numeric(14,2) AS total
             FROM pedido_promissorias pp
             JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'
             WHERE pp.paid_at IS NULL`,
    }).catch(() => ({ rows: [{ total: 0 }] })),
    serieDreMensalPromise,
  ]);

  const receitas = Number((vendasR.rows[0] as Record<string, unknown>)?.total || 0);
  const custosVendas = Number((cogsR.rows[0] as Record<string, unknown>)?.cogs || 0);
  const despesasBase = Number((despesasR.rows[0] as Record<string, unknown>)?.total || 0);
  const freteCustoPeriodo = Number(
    (freteCustoPeriodoR.rows[0] as Record<string, unknown>)?.total || 0
  );
  const despesas = Number((despesasBase + freteCustoPeriodo).toFixed(2));
  const lucroBruto = Number((receitas - custosVendas).toFixed(2));
  const lucroOperacional = Number((lucroBruto - despesas).toFixed(2));
  const margemBruta = receitas > 0 ? Number(((lucroBruto / receitas) * 100).toFixed(2)) : 0;
  const margemOperacional = receitas > 0 ? Number(((lucroOperacional / receitas) * 100).toFixed(2)) : 0;

  const entAnt = Number((entAntR.rows[0] as Record<string, unknown>)?.total || 0);
  const promAnt = Number((promAntR.rows[0] as Record<string, unknown>)?.total || 0);
  const aportAnt = Number((aportAntR.rows[0] as Record<string, unknown>)?.total || 0);
  const compAnt = Number((compAntR.rows[0] as Record<string, unknown>)?.total || 0);
  const despAnt = Number((despAntR.rows[0] as Record<string, unknown>)?.total || 0);
  const saldoInicial = Number((entAnt + promAnt + aportAnt - compAnt - despAnt).toFixed(2));

  const vendas = Number((vendasR2.rows[0] as Record<string, unknown>)?.total || 0);
  const promissoriasRecebidas = Number((promPagosR.rows[0] as Record<string, unknown>)?.total || 0);
  const aportesCapital = Number((aportesR.rows[0] as Record<string, unknown>)?.total || 0);
  const compras = Number((comprasR.rows[0] as Record<string, unknown>)?.total || 0);
  const despesasOperacionaisPeriodoBase = Number(
    (despesasR2.rows[0] as Record<string, unknown>)?.operacionais || 0
  );
  const despesasOperacionaisPeriodo = Number(
    (despesasOperacionaisPeriodoBase + freteCustoPeriodo).toFixed(2)
  );
  const devolucaoCapitalPeriodo = Number((despesasR2.rows[0] as Record<string, unknown>)?.devolucao || 0);
  const despesasPeriodoTotal = Number((despesasOperacionaisPeriodo + devolucaoCapitalPeriodo).toFixed(2));
  const entradas = Number((vendas + promissoriasRecebidas + aportesCapital).toFixed(2));
  const saidas = Number((compras + despesasPeriodoTotal).toFixed(2));
  const saldo = Number((entradas - saidas).toFixed(2));
  const saldoFinal = Number((saldoInicial + saldo).toFixed(2));
  const fluxoOperacional = Number((vendas + promissoriasRecebidas - compras - despesasOperacionaisPeriodo).toFixed(2));

  let saldoAcum = saldoInicial;
  const evolucaoMensal = ((evolucaoMensalR.rows || []) as Array<Record<string, unknown>>).map((r) => {
    const ent = Number(r.entradas || 0);
    const sai = Number(r.saidas || 0);
    const saldoMes = Number((ent - sai).toFixed(2));
    saldoAcum = Number((saldoAcum + saldoMes).toFixed(2));
    return {
      mes: String(r.mes ?? ""),
      entradas: ent,
      saidas: sai,
      saldoPeriodo: saldoMes,
      saldoAcumulado: saldoAcum,
    };
  });

  const indicadoresFull = await computeIndicadores(firstDay, lastDay, {
    vendas: receitas,
    compras,
    cogs: custosVendas,
  });
  const { indicadores, indicadoresDerivadosBi } =
    buildIndicadoresConsolidados(indicadoresFull);

  const [contasReceberAgingPorCliente, fretePeriodo, comprasPorFornecedor, comparativoInteranual] =
    await Promise.all([
      fetchContasReceberAgingPorCliente(),
      fetchFretePeriodo(firstDay, lastDay),
      fetchComprasPorFornecedor(firstDay, lastDay),
      serieDreMensal
        ? fetchComparativoInteranual(
            serieDreMensal.meses,
            serieDreMensal.intervalo.inicio,
            serieDreMensal.intervalo.fim_exclusivo
          )
        : Promise.resolve(null),
    ]);

  const mesesComMedias = serieDreMensal
    ? enrichSerieComMediasMoveis(serieDreMensal.meses)
    : undefined;

  const serieDreMensalOut =
    serieDreMensal && mesesComMedias
      ? { ...serieDreMensal, meses_com_medias: mesesComMedias }
      : serieDreMensal;

  let dreAnterior: { receitas: number; lucroOperacional: number; margemBruta: number } | null = null;
  let margemAnterior: { totalReceita: number; margemMediaPonderada: number } | null = null;
  let rankingAnterior: { totalGeral: number } | null = null;
  if (mes > 0 && ano > 0) {
    const mesAnt = mes === 1 ? 12 : mes - 1;
    const anoAnt = mes === 1 ? ano - 1 : ano;
    const { firstDay: fa, lastDay: la } = getReportBounds(mesAnt, anoAnt);
    const [vAnt, cAnt, dAnt, freteAntR, mAnt, rAnt] = await Promise.all([
      database.query({
        text: `SELECT COALESCE(SUM(total_liquido),0)::numeric(14,2) AS total
             FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
             AND data_emissao >= $1 AND data_emissao < $2`,
        values: [fa, la],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
             FROM pedido_itens i JOIN pedidos p ON p.id = i.pedido_id
             WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
             AND p.data_emissao >= $1 AND p.data_emissao < $2`,
        values: [fa, la],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
             FROM despesas
             WHERE data_vencimento >= $1 AND data_vencimento < $2
             AND (categoria IS NULL OR categoria::text != 'devolucao_capital')`,
        values: [fa, la],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
                 AND data_emissao >= $1 AND data_emissao < $2`,
        values: [fa, la],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(i.total_item),0)::numeric(14,2) AS receita,
             (COALESCE(SUM(i.total_item),0) - COALESCE(SUM(i.custo_total_item),0))::numeric(14,2) AS lucro
             FROM pedido_itens i JOIN pedidos pdr ON pdr.id = i.pedido_id
             WHERE pdr.tipo = 'VENDA' AND pdr.status = 'confirmado'
             AND pdr.data_emissao >= $1 AND pdr.data_emissao < $2`,
        values: [fa, la],
      }),
      database.query({
        text: `SELECT COALESCE(SUM(p.total_liquido),0)::numeric(14,2) AS total
             FROM pedidos p WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
             AND p.data_emissao >= $1 AND p.data_emissao < $2`,
        values: [fa, la],
      }),
    ]);
    const recAnt = Number((vAnt.rows[0] as Record<string, unknown>)?.total || 0);
    const custAnt = Number((cAnt.rows[0] as Record<string, unknown>)?.cogs || 0);
    const despAnt = Number((dAnt.rows[0] as Record<string, unknown>)?.total || 0);
    const freteCustoAnt = Number((freteAntR.rows[0] as Record<string, unknown>)?.total || 0);
    const despesasComFreteAnt = Number((despAnt + freteCustoAnt).toFixed(2));
    const lucOpAnt = Number((recAnt - custAnt - despesasComFreteAnt).toFixed(2));
    const margBrAnt = recAnt > 0 ? Number(((recAnt - custAnt) / recAnt * 100).toFixed(2)) : 0;
    dreAnterior = { receitas: recAnt, lucroOperacional: lucOpAnt, margemBruta: margBrAnt };
    const mRow = mAnt.rows[0] as Record<string, unknown>;
    const totalRecAnt = Number(mRow?.receita || 0);
    const lucroAnt = Number(mRow?.lucro || 0);
    const margMediaAnt = totalRecAnt > 0 ? Number(((lucroAnt / totalRecAnt) * 100).toFixed(2)) : 0;
    margemAnterior = { totalReceita: totalRecAnt, margemMediaPonderada: margMediaAnt };
    const totalRankAnt = Number((rAnt.rows[0] as Record<string, unknown>)?.total || 0);
    rankingAnterior = { totalGeral: totalRankAnt };
  }

  const margemRows = margemR.rows as Array<Record<string, unknown>>;
  const totalReceita = margemRows.reduce((s, r) => s + Number(r.receita || 0), 0);
  const lucroTotal = margemRows.reduce((s, r) => s + Number(r.lucro || 0), 0);
  const margemMediaPonderada = totalReceita > 0 ? Number(((lucroTotal / totalReceita) * 100).toFixed(2)) : 0;
  const itensMargem = margemRows.map((r) => {
    const receita = Number(r.receita || 0);
    const lucro = Number(r.lucro || 0);
    const margem = receita > 0 ? Number(((lucro / receita) * 100).toFixed(2)) : 0;
    const participacaoVendas = totalReceita > 0 ? Number(((receita / totalReceita) * 100).toFixed(2)) : 0;
    return {
      produto_id: r.produto_id as string | number,
      nome: String(r.nome ?? ""),
      receita,
      cogs: Number(r.cogs || 0),
      lucro,
      margem,
      participacaoVendas,
    };
  });

  const valorPresumidoVendaEstoque = Number((estoqueVendaR.rows[0] as Record<string, unknown>)?.total || 0);
  const promissoriasAReceber = Number((promissoriasAReceberR.rows[0] as Record<string, unknown>)?.total || 0);
  const config = getConfigLiquidacao();
  const saldoDevolverFromEnv = Number(process.env.SALDO_DEVOLVER_SOCIOS);
  const saldoDevolverSocios =
    Number.isFinite(saldoDevolverFromEnv) && saldoDevolverFromEnv >= 0
      ? saldoDevolverFromEnv
      : await computeSaldoDevolverSocios();
  const cenarioLiquidacao = computeCenarioLiquidacao({
    saldoCaixaAtual: saldoFinal,
    valorPresumidoVendaEstoque,
    promissoriasAReceber,
    comissaoPct: config.comissaoPct,
    saldoDevolverSocios,
  });

  const mesesNoIntervalo = listMesesNoIntervalo(firstDay, lastDay);
  const metasPorAno = new Map<number, number[]>();
  for (const m of mesesNoIntervalo) {
    metasPorAno.set(m.ano, [...(metasPorAno.get(m.ano) ?? []), m.mes]);
  }
  const metasRows: MetaMensalRow[] = (
    await Promise.all(
      [...metasPorAno.entries()].map(([a, mesesArr]) => fetchMetasMensais(a, mesesArr))
    )
  ).flat();

  const receitaMeta = Number(
    metasRows.reduce((s, r) => s + Number(r.meta_receita || 0), 0).toFixed(2)
  );
  const lucroOpMeta = Number(
    metasRows.reduce((s, r) => s + Number(r.meta_lucro_operacional || 0), 0).toFixed(2)
  );
  const margemOpMeta =
    receitaMeta > 0 ? Number(((lucroOpMeta / receitaMeta) * 100).toFixed(2)) : null;

  const metas =
    metasRows.length > 0
      ? {
          periodo: { inicio: firstDay, fim_exclusivo: lastDay, tipo: `meses_${mesesNoIntervalo.length}` },
          receita_meta: receitaMeta,
          lucro_operacional_meta: lucroOpMeta,
          margem_operacional_meta: margemOpMeta,
          receita_realizado: receitas,
          lucro_operacional_realizado: lucroOperacional,
          margem_operacional_realizado: margemOperacional,
          atingimento_receita_pct:
            receitaMeta > 0 ? Number(((receitas / receitaMeta) * 100).toFixed(1)) : null,
          atingimento_lucro_operacional_pct:
            lucroOpMeta > 0 ? Number(((lucroOperacional / lucroOpMeta) * 100).toFixed(1)) : null,
          variacao_receita_pct:
            receitaMeta > 0 ? Number((((receitas / receitaMeta) - 1) * 100).toFixed(1)) : null,
          variacao_lucro_operacional_pct:
            lucroOpMeta > 0
              ? Number((((lucroOperacional / lucroOpMeta) - 1) * 100).toFixed(1))
              : null,
          meses_meta_count: metasRows.length,
        }
      : undefined;

  const margemLiquidaPorClienteEstimado =
    await fetchMargemLiquidaPorClienteEstimado(
      firstDay,
      lastDay,
      config.comissaoPct / 100,
      10
    );

  const rankingRows = rankingR.rows as Array<Record<string, unknown>>;
  const totalGeral = Number((totalGeralR.rows[0] as Record<string, unknown>)?.total || 0);
  const itensRanking = rankingRows.map((r) => {
    const total = Number(r.total || 0);
    const cogs = Number(r.cogs || 0);
    const pedidosCount = Number(r.pedidos_count || 0);
    const margemBrutaCliente = total > 0 && cogs > 0 ? Number(((total - cogs) / total * 100).toFixed(2)) : null;
    return {
      entity_id: r.entity_id as string | number,
      nome: String(r.nome ?? "").trim() || "Cliente sem nome",
      total,
      margemBruta: margemBrutaCliente,
      pedidos_count: pedidosCount,
      ticketMedio: pedidosCount > 0 ? Number((total / pedidosCount).toFixed(2)) : 0,
      participacaoTotal: totalGeral > 0 ? Number(((total / totalGeral) * 100).toFixed(2)) : 0,
    };
  });

  return {
    periodo: { mes, ano, firstDay, lastDay },
    dre: {
      receitas,
      receitaBruta: receitas,
      receitaLiquida: receitas,
      custosVendas,
      lucroBruto,
      despesas,
      impostos: 0,
      lucroOperacional,
      ebitda: lucroOperacional,
      margemBruta,
      margemOperacional,
    },
    fluxo: {
      saldoInicial,
      saldoFinal,
      entradas: { vendas, promissoriasRecebidas, aportesCapital, total: entradas },
      saidas: { compras, despesas: despesasOperacionaisPeriodo, devolucao_capital: devolucaoCapitalPeriodo, total: saidas },
      saldo,
      fluxoOperacional,
      evolucaoMensal,
    },
    indicadores,
    margem: { itens: itensMargem, totalReceita, margemMediaPonderada },
    ranking: { itens: itensRanking, totalGeral },
    ...(dreAnterior ? { dreAnterior } : {}),
    ...(margemAnterior ? { margemAnterior } : {}),
    ...(rankingAnterior ? { rankingAnterior } : {}),
    cenarioLiquidacao,
    margemLiquidaPorClienteEstimado,
    ...(metas ? { metas } : {}),
    serieDreMensal: serieDreMensalOut,
    contasReceberAgingPorCliente,
    fretePeriodo,
    comprasPorFornecedor,
    comparativoInteranual,
    indicadoresDerivadosBi,
  };
}

export function payloadParaAlertas(payload: PayloadConsolidado): DadosParaAlertas {
  return {
    dre: {
      receitas: payload.dre.receitas,
      lucroBruto: payload.dre.lucroBruto,
      lucroOperacional: payload.dre.lucroOperacional,
      despesas: payload.dre.despesas,
      margemBruta: payload.dre.margemBruta,
      margemOperacional: payload.dre.margemOperacional,
    },
    fluxo: {
      saldoFinal: payload.fluxo.saldoFinal,
      fluxoOperacional: payload.fluxo.fluxoOperacional,
      evolucaoMensal: payload.fluxo.evolucaoMensal,
    },
    indicadores: {
      pmr: payload.indicadores.pmr,
      pmp: payload.indicadores.pmp,
      dve: payload.indicadores.dve,
    },
    margem: {
      itens: payload.margem.itens,
      totalReceita: payload.margem.totalReceita,
      margemMediaPonderada: payload.margem.margemMediaPonderada,
    },
    ranking: {
      itens: payload.ranking.itens,
      totalGeral: payload.ranking.totalGeral,
    },
  };
}
