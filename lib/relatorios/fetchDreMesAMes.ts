/**
 * DRE agregada mês a mês no intervalo [firstDay, lastDay) (lastDay exclusivo).
 * Mesmas regras do DRE principal: vendas confirmadas, COGS em itens, despesas por vencimento
 * excluindo devolucao_capital.
 */
import database from "infra/database.js";

export interface DreMesRow {
  mes: string;
  periodo_inicio: string;
  periodo_fim_exclusivo: string;
  receitas: number;
  custos_vendas: number;
  despesas: number;
  lucro_bruto: number;
  lucro_operacional: number;
  margem_bruta_pct: number;
  margem_operacional_pct: number;
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

export async function fetchDreMesAMes(
  firstDay: string,
  lastDay: string
): Promise<DreMesRow[]> {
  const result = await database.query({
    text: `WITH meses AS (
             SELECT generate_series(
               date_trunc('month', $1::date)::timestamp,
               date_trunc('month', ($2::date - interval '1 day'))::timestamp,
               interval '1 month'
             ) AS mstart
           )
           SELECT
             to_char(m.mstart, 'YYYY-MM') AS mes,
             to_char(m.mstart::date, 'YYYY-MM-DD') AS periodo_inicio,
             to_char((m.mstart + interval '1 month')::date, 'YYYY-MM-DD') AS periodo_fim_exclusivo,
             (SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2)
              FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
              AND data_emissao >= m.mstart AND data_emissao < m.mstart + interval '1 month') AS receitas,
             (SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2)
              FROM pedido_itens i JOIN pedidos p ON p.id = i.pedido_id
              WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
              AND p.data_emissao >= m.mstart AND p.data_emissao < m.mstart + interval '1 month') AS custos_vendas,
             (SELECT COALESCE(SUM(valor),0)::numeric(14,2)
              FROM despesas
              WHERE data_vencimento >= m.mstart AND data_vencimento < m.mstart + interval '1 month'
              AND (categoria IS NULL OR categoria::text != 'devolucao_capital')) AS despesas
           FROM meses m
           ORDER BY m.mstart`,
    values: [firstDay, lastDay],
  });

  const rows = result.rows as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const receitas = Number(r.receitas || 0);
    const custos_vendas = Number(r.custos_vendas || 0);
    const despesas = Number(r.despesas || 0);
    const lucro_bruto = round2(receitas - custos_vendas);
    const lucro_operacional = round2(lucro_bruto - despesas);
    const margem_bruta_pct =
      receitas > 0 ? round2((lucro_bruto / receitas) * 100) : 0;
    const margem_operacional_pct =
      receitas > 0 ? round2((lucro_operacional / receitas) * 100) : 0;
    return {
      mes: String(r.mes ?? ""),
      periodo_inicio: String(r.periodo_inicio ?? ""),
      periodo_fim_exclusivo: String(r.periodo_fim_exclusivo ?? ""),
      receitas,
      custos_vendas,
      despesas,
      lucro_bruto,
      lucro_operacional,
      margem_bruta_pct,
      margem_operacional_pct,
    };
  });
}

export function somarDreMeses(meses: DreMesRow[]): DreMesRow {
  const receitas = round2(meses.reduce((s, m) => s + m.receitas, 0));
  const custos_vendas = round2(meses.reduce((s, m) => s + m.custos_vendas, 0));
  const despesas = round2(meses.reduce((s, m) => s + m.despesas, 0));
  const lucro_bruto = round2(receitas - custos_vendas);
  const lucro_operacional = round2(lucro_bruto - despesas);
  const margem_bruta_pct =
    receitas > 0 ? round2((lucro_bruto / receitas) * 100) : 0;
  const margem_operacional_pct =
    receitas > 0 ? round2((lucro_operacional / receitas) * 100) : 0;
  return {
    mes: "TOTAL",
    periodo_inicio: "",
    periodo_fim_exclusivo: "",
    receitas,
    custos_vendas,
    despesas,
    lucro_bruto,
    lucro_operacional,
    margem_bruta_pct,
    margem_operacional_pct,
  };
}
