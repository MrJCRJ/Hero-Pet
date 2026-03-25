/**
 * Aging de contas a receber por cliente (titulos em aberto).
 * Faixas por dias em relação ao vencimento: a vencer, vencido 0-30, 31-60, 61-90, 90+.
 */
import database from "infra/database.js";

export interface AgingClienteRow {
  entity_id: number;
  nome: string;
  a_vencer: number;
  vencido_0_30: number;
  vencido_31_60: number;
  vencido_61_90: number;
  vencido_mais_90: number;
  total_aberto: number;
}

export interface AgingTotais {
  a_vencer: number;
  vencido_0_30: number;
  vencido_31_60: number;
  vencido_61_90: number;
  vencido_mais_90: number;
  total_aberto: number;
}

export async function fetchContasReceberAgingPorCliente(): Promise<{
  clientes: AgingClienteRow[];
  totais: AgingTotais;
}> {
  const result = await database.query({
    text: `WITH aberto AS (
             SELECT pp.amount,
                    p.partner_entity_id AS entity_id,
                    COALESCE(NULLIF(TRIM(p.partner_name), ''), e.name, 'Sem nome') AS nome,
                    pp.due_date::date AS due
             FROM pedido_promissorias pp
             JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'
             LEFT JOIN entities e ON e.id = p.partner_entity_id
             WHERE pp.paid_at IS NULL
           ),
           agg AS (
             SELECT entity_id,
                    MAX(nome) AS nome,
                    COALESCE(SUM(CASE WHEN due > CURRENT_DATE THEN amount ELSE 0 END), 0)::numeric(14,2) AS a_vencer,
                    COALESCE(SUM(CASE WHEN due <= CURRENT_DATE AND (CURRENT_DATE - due) BETWEEN 0 AND 30 THEN amount ELSE 0 END), 0)::numeric(14,2) AS vencido_0_30,
                    COALESCE(SUM(CASE WHEN due <= CURRENT_DATE AND (CURRENT_DATE - due) BETWEEN 31 AND 60 THEN amount ELSE 0 END), 0)::numeric(14,2) AS vencido_31_60,
                    COALESCE(SUM(CASE WHEN due <= CURRENT_DATE AND (CURRENT_DATE - due) BETWEEN 61 AND 90 THEN amount ELSE 0 END), 0)::numeric(14,2) AS vencido_61_90,
                    COALESCE(SUM(CASE WHEN due <= CURRENT_DATE AND (CURRENT_DATE - due) > 90 THEN amount ELSE 0 END), 0)::numeric(14,2) AS vencido_mais_90,
                    COALESCE(SUM(amount), 0)::numeric(14,2) AS total_aberto
             FROM aberto
             GROUP BY entity_id
           )
           SELECT * FROM agg ORDER BY total_aberto DESC NULLS LAST LIMIT 500`,
  });

  const rows = result.rows as Array<Record<string, unknown>>;
  const clientes: AgingClienteRow[] = rows.map((r) => ({
    entity_id: Number(r.entity_id || 0),
    nome: String(r.nome ?? ""),
    a_vencer: Number(r.a_vencer || 0),
    vencido_0_30: Number(r.vencido_0_30 || 0),
    vencido_31_60: Number(r.vencido_31_60 || 0),
    vencido_61_90: Number(r.vencido_61_90 || 0),
    vencido_mais_90: Number(r.vencido_mais_90 || 0),
    total_aberto: Number(r.total_aberto || 0),
  }));

  const totais: AgingTotais = clientes.reduce(
    (acc, c) => ({
      a_vencer: acc.a_vencer + c.a_vencer,
      vencido_0_30: acc.vencido_0_30 + c.vencido_0_30,
      vencido_31_60: acc.vencido_31_60 + c.vencido_31_60,
      vencido_61_90: acc.vencido_61_90 + c.vencido_61_90,
      vencido_mais_90: acc.vencido_mais_90 + c.vencido_mais_90,
      total_aberto: acc.total_aberto + c.total_aberto,
    }),
    {
      a_vencer: 0,
      vencido_0_30: 0,
      vencido_31_60: 0,
      vencido_61_90: 0,
      vencido_mais_90: 0,
      total_aberto: 0,
    }
  );

  return { clientes, totais };
}
