// pages/api/v1/pedidos/promissorias.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

function monthBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const nextStart = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const ymd = (x) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { startYMD: ymd(start), nextStartYMD: ymd(nextStart) };
}

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ error: `Method "${req.method}" not allowed` });
  try {
    const { month, status, limit } = req.query;
    let refDate = new Date();
    if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      refDate = new Date(y, m - 1, 1);
    }
    const { startYMD, nextStartYMD } = monthBounds(refDate);
    const nextMonth = monthBounds(
      new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1),
    );

    const allowed = new Set([
      "pagas",
      "pendentes",
      "atrasadas",
      "proximo",
      "carry",
    ]);
    const kind = typeof status === "string" ? status.toLowerCase() : "";
    if (!allowed.has(kind)) {
      return res
        .status(400)
        .json({
          error:
            "status inválido (use: pagas|pendentes|atrasadas|proximo|carry)",
        });
    }

    const clauses = [];
    const values = [];
    // Filtros por categoria
    if (kind === "pagas") {
      clauses.push("pp.paid_at IS NOT NULL");
      values.push(startYMD, nextStartYMD);
      clauses.push(
        `pp.due_date >= $${values.length - 1} AND pp.due_date < $${values.length}`,
      );
    } else if (kind === "pendentes") {
      clauses.push("pp.paid_at IS NULL");
      values.push(startYMD, nextStartYMD);
      clauses.push(
        `pp.due_date >= $${values.length - 1} AND pp.due_date < $${values.length}`,
      );
      clauses.push("pp.due_date >= CURRENT_DATE");
    } else if (kind === "atrasadas") {
      clauses.push("pp.paid_at IS NULL");
      values.push(startYMD, nextStartYMD);
      clauses.push(
        `pp.due_date >= $${values.length - 1} AND pp.due_date < $${values.length}`,
      );
      clauses.push("pp.due_date < CURRENT_DATE");
    } else if (kind === "proximo") {
      clauses.push("pp.paid_at IS NULL");
      values.push(nextMonth.startYMD, nextMonth.nextStartYMD);
      clauses.push(
        `pp.due_date >= $${values.length - 1} AND pp.due_date < $${values.length}`,
      );
    } else if (kind === "carry") {
      clauses.push("pp.paid_at IS NULL");
      values.push(startYMD);
      clauses.push(`pp.due_date < $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const effectiveLimit = Math.min(parseInt(limit || "500", 10) || 500, 1000);

    const q = {
      text: `SELECT pp.pedido_id, pp.seq,
                    to_char(pp.due_date, 'YYYY-MM-DD') AS due_date,
                    pp.amount, pp.paid_at,
                    CASE 
                      WHEN pp.paid_at IS NOT NULL THEN 'PAGO'
                      WHEN pp.due_date < CURRENT_DATE THEN 'ATRASADO'
                      ELSE 'PENDENTE'
                    END AS status,
                    p.tipo,
                    COALESCE(p.partner_name, e.name) AS partner_name
             FROM pedido_promissorias pp
             JOIN pedidos p ON p.id = pp.pedido_id
             LEFT JOIN entities e ON e.id = p.partner_entity_id
             ${where}
             ORDER BY pp.due_date ASC, pp.pedido_id ASC, pp.seq ASC
             LIMIT ${effectiveLimit}`,
      values,
    };
    const rows = await database.query(q);
    return res.status(200).json(rows.rows);
  } catch (e) {
    console.error("GET /pedidos/promissorias error", e);
    if (isRelationMissing(e))
      return res.status(503).json({
        error: "Schema not migrated (pedido_promissorias|pedidos missing)",
        dependency: "database",
        code: e.code,
        action: "Run migrations",
      });
    if (isConnectionError(e))
      return res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: e.code,
      });
    return res.status(500).json({ error: "Internal error" });
  }
}
