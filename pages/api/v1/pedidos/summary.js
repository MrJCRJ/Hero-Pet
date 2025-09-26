// pages/api/v1/pedidos/summary.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

function monthBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const nextStart = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const ymd = (x) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return {
    startYMD: ymd(start),
    nextStartYMD: ymd(nextStart),
    prevStartYMD: ymd(prevStart),
    label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ error: `Method "${req.method}" not allowed` });

  try {
    // Opcional: permitir query month=YYYY-MM
    const { month } = req.query;
    let refDate = new Date();
    if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      refDate = new Date(y, m - 1, 1);
    }
    const { startYMD, nextStartYMD, label } = monthBounds(refDate);

    // Totais do mês (por data_emissao)
    const vendasQ = await database.query({
      text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos
             WHERE tipo = 'VENDA' AND data_emissao >= $1 AND data_emissao < $2`,
      values: [startYMD, nextStartYMD],
    });
    const comprasQ = await database.query({
      text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos
             WHERE tipo = 'COMPRA' AND data_emissao >= $1 AND data_emissao < $2`,
      values: [startYMD, nextStartYMD],
    });

    // Promissórias do mês corrente (por due_date)
    const promMesQ = await database.query({
      text: `SELECT
                SUM(CASE WHEN paid_at IS NOT NULL THEN 1 ELSE 0 END)::int AS pagos_count,
                COALESCE(SUM(CASE WHEN paid_at IS NOT NULL THEN amount ELSE 0 END),0)::numeric(14,2) AS pagos_valor,
                SUM(CASE WHEN paid_at IS NULL AND due_date >= CURRENT_DATE THEN 1 ELSE 0 END)::int AS pendentes_count,
                COALESCE(SUM(CASE WHEN paid_at IS NULL AND due_date >= CURRENT_DATE THEN amount ELSE 0 END),0)::numeric(14,2) AS pendentes_valor,
                SUM(CASE WHEN paid_at IS NULL AND due_date < CURRENT_DATE THEN 1 ELSE 0 END)::int AS atrasados_count,
                COALESCE(SUM(CASE WHEN paid_at IS NULL AND due_date < CURRENT_DATE THEN amount ELSE 0 END),0)::numeric(14,2) AS atrasados_valor
             FROM pedido_promissorias
             WHERE due_date >= $1 AND due_date < $2`,
      values: [startYMD, nextStartYMD],
    });

    const nextMonthBounds = monthBounds(
      new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1),
    );
    const promNext = await database.query({
      text: `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric(14,2) AS valor
             FROM pedido_promissorias
             WHERE paid_at IS NULL AND due_date >= $1 AND due_date < $2`,
      values: [nextMonthBounds.startYMD, nextMonthBounds.nextStartYMD],
    });

    // Meses anteriores em aberto (carry-over)
    const promCarry = await database.query({
      text: `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric(14,2) AS valor
             FROM pedido_promissorias
             WHERE paid_at IS NULL AND due_date < $1`,
      values: [startYMD],
    });

    return res.status(200).json({
      month: label,
      vendasMes: Number(vendasQ.rows[0]?.total || 0),
      comprasMes: Number(comprasQ.rows[0]?.total || 0),
      promissorias: {
        mesAtual: {
          pagos: {
            count: promMesQ.rows[0]?.pagos_count || 0,
            valor: Number(promMesQ.rows[0]?.pagos_valor || 0),
          },
          pendentes: {
            count: promMesQ.rows[0]?.pendentes_count || 0,
            valor: Number(promMesQ.rows[0]?.pendentes_valor || 0),
          },
          atrasados: {
            count: promMesQ.rows[0]?.atrasados_count || 0,
            valor: Number(promMesQ.rows[0]?.atrasados_valor || 0),
          },
        },
        proximoMes: {
          pendentes: {
            count: promNext.rows[0]?.count || 0,
            valor: Number(promNext.rows[0]?.valor || 0),
          },
        },
        deMesesAnteriores: {
          emAberto: {
            count: promCarry.rows[0]?.count || 0,
            valor: Number(promCarry.rows[0]?.valor || 0),
          },
        },
      },
    });
  } catch (e) {
    console.error("GET /pedidos/summary error", e);
    if (isRelationMissing(e))
      return res.status(503).json({
        error: "Schema not migrated (pedidos|pedido_promissorias missing)",
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
