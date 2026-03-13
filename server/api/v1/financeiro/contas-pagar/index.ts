import database from "infra/database.js";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

function monthBounds(month?: string) {
  if (month === "all" || month === "") {
    return { startYMD: null as string | null, nextYMD: null as string | null, all: true };
  }
  let refDate = new Date();
  if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    refDate = new Date(y, m - 1, 1);
  }
  const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const next = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startYMD: ymd(start), nextYMD: ymd(next), all: false };
}

export default async function contasPagarHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const month = req.query?.month as string | undefined;
    const status = (req.query?.status as string) || "pendentes";
    const { startYMD, nextYMD, all } = monthBounds(month);

    const promissoriasWhere = all
      ? (status === "pendentes"
          ? `pp.paid_at IS NULL`
          : `pp.paid_at IS NOT NULL`)
      : (status === "pendentes"
          ? `pp.paid_at IS NULL AND pp.due_date >= $1::date AND pp.due_date < $2::date`
          : `pp.paid_at IS NOT NULL AND pp.due_date >= $1::date AND pp.due_date < $2::date`);

    const despesasWhere = all
      ? (status === "pendentes"
          ? `d.status = 'pendente'`
          : `d.status = 'pago' AND d.data_pagamento IS NOT NULL`)
      : (status === "pendentes"
          ? `d.status = 'pendente' AND d.data_vencimento >= $1::date AND d.data_vencimento < $2::date`
          : `d.status = 'pago' AND d.data_pagamento IS NOT NULL AND d.data_pagamento >= $1::date AND d.data_pagamento < $2::date`);

    const values = all ? [] : [startYMD, nextYMD];

    const [promR, despesasR] = await Promise.all([
      database.query({
        text: `SELECT pp.pedido_id, pp.seq, to_char(pp.due_date, 'YYYY-MM-DD') AS due_date,
                      pp.amount, pp.paid_at,
                      'COMPRA' AS origem,
                      COALESCE(p.partner_name, e.name) AS partner_name
               FROM pedido_promissorias pp
               JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'COMPRA'
               LEFT JOIN entities e ON e.id = p.partner_entity_id
               WHERE ${promissoriasWhere}
               ORDER BY pp.due_date ASC
               LIMIT 250`,
        values,
      }),
      database.query({
        text: `SELECT d.id AS despesa_id, d.descricao, d.valor AS amount,
                      to_char(d.data_vencimento, 'YYYY-MM-DD') AS due_date,
                      d.data_pagamento AS paid_at, d.status,
                      'DESPESA' AS origem,
                      e.name AS partner_name
               FROM despesas d
               LEFT JOIN entities e ON e.id = d.fornecedor_id
               WHERE ${despesasWhere}
               ORDER BY d.data_vencimento ASC
               LIMIT 250`,
        values,
      }),
    ]);

    const prom = (promR.rows as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      tipo: "promissoria",
    }));
    const desp = (despesasR.rows as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      tipo: "despesa",
    }));

    const itens = [...prom, ...desp].sort(
      (a, b) =>
        String((a as Record<string, unknown>).due_date).localeCompare(
          String((b as Record<string, unknown>).due_date)
        )
    );
    const total = itens.reduce(
      (s, r) => s + Number((r as Record<string, unknown>).amount || 0),
      0
    );

    res.status(200).json({
      periodo: { month: all ? "all" : (month || null), startYMD, nextYMD },
      status,
      itens,
      total: Number(total.toFixed(2)),
    });
  } catch (e) {
    console.error("GET /financeiro/contas-pagar error", e);
    res.status(500).json({ error: "Erro ao buscar contas a pagar" });
  }
}
