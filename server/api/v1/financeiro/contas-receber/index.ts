import database from "infra/database.js";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

function monthBounds(month?: string) {
  let refDate = new Date();
  if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    refDate = new Date(y, m - 1, 1);
  }
  const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const next = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1);
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startYMD: ymd(start), nextYMD: ymd(next) };
}

export default async function contasReceberHandler(
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
    const { startYMD, nextYMD } = monthBounds(month);

    let whereClause = `p.tipo = 'VENDA'`;
    const values: unknown[] = [startYMD, nextYMD];

    if (status === "pendentes") {
      whereClause += ` AND pp.paid_at IS NULL AND pp.due_date >= CURRENT_DATE AND pp.due_date >= $1 AND pp.due_date < $2`;
    } else if (status === "atrasadas") {
      whereClause += ` AND pp.paid_at IS NULL AND pp.due_date < CURRENT_DATE AND pp.due_date >= $1 AND pp.due_date < $2`;
    } else {
      whereClause += ` AND pp.paid_at IS NOT NULL AND pp.due_date >= $1 AND pp.due_date < $2`;
    }

    const result = await database.query({
      text: `SELECT pp.pedido_id, pp.seq, to_char(pp.due_date, 'YYYY-MM-DD') AS due_date,
                    pp.amount, pp.paid_at,
                    CASE WHEN pp.paid_at IS NOT NULL THEN 'PAGO'
                         WHEN pp.due_date < CURRENT_DATE THEN 'ATRASADO'
                         ELSE 'PENDENTE' END AS status,
                    COALESCE(p.partner_name, e.name) AS partner_name
             FROM pedido_promissorias pp
             JOIN pedidos p ON p.id = pp.pedido_id
             LEFT JOIN entities e ON e.id = p.partner_entity_id
             WHERE ${whereClause}
             ORDER BY pp.due_date ASC, pp.pedido_id ASC, pp.seq ASC
             LIMIT 500`,
      values,
    });

    const rows = result.rows as Array<Record<string, unknown>>;
    const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

    res.status(200).json({
      periodo: { month: month || null, startYMD, nextYMD },
      status,
      itens: rows,
      total: Number(total.toFixed(2)),
    });
  } catch (e) {
    console.error("GET /financeiro/contas-receber error", e);
    res.status(500).json({ error: "Erro ao buscar contas a receber" });
  }
}
