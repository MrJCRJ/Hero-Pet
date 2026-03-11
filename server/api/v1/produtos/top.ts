// pages/api/v1/produtos/top.ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

function monthBounds(d: Date = new Date()): {
  startYMD: string;
  nextStartYMD: string;
  label: string;
} {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const ymd = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return {
    startYMD: ymd(start),
    nextStartYMD: ymd(next),
    label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  try {
    const month = req.query?.month;
    let refDate = new Date();
    if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      refDate = new Date(y, m - 1, 1);
    }
    const { startYMD, nextStartYMD, label } = monthBounds(refDate);

    const topNRaw = Number(req.query?.topN || 5);
    const topN = Math.min(50, Math.max(1, isNaN(topNRaw) ? 5 : topNRaw));
    const productMonthsRaw = Number(req.query?.productMonths || 6);
    const productMonths = Math.min(
      24,
      Math.max(2, isNaN(productMonthsRaw) ? 6 : productMonthsRaw)
    );

    let topRows: Array<Record<string, unknown>> = [];
    try {
      const q = await database.query({
        text: `SELECT i.produto_id, p.nome,
                      COALESCE(SUM(i.total_item),0)::numeric(14,2) AS receita,
                      COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs,
                      (COALESCE(SUM(i.total_item),0) - COALESCE(SUM(i.custo_total_item),0))::numeric(14,2) AS lucro,
                      COALESCE(SUM(i.quantidade),0)::numeric(14,3) AS quantidade
               FROM pedido_itens i
               JOIN pedidos pd ON pd.id = i.pedido_id
               JOIN produtos p ON p.id = i.produto_id
               WHERE pd.tipo='VENDA' AND pd.data_emissao >= $1 AND pd.data_emissao < $2
               GROUP BY i.produto_id, p.nome
               HAVING COALESCE(SUM(i.total_item),0) > 0
               ORDER BY lucro DESC, receita DESC
               LIMIT ${topN}`,
        values: [startYMD, nextStartYMD],
      });
      topRows = (q.rows as Array<Record<string, unknown>>).map((r) => {
        const receita = Number(r.receita || 0);
        const cogs = Number(r.cogs || 0);
        const lucro = Number(r.lucro || 0);
        const margem =
          receita > 0 ? Number(((lucro / receita) * 100).toFixed(2)) : 0;
        return {
          produto_id: r.produto_id,
          nome: r.nome,
          receita,
          cogs,
          lucro,
          margem,
          quantidade: Number(r.quantidade || 0),
          lucro_unitario: Number(
            (lucro / (Number(r.quantidade) || 1)).toFixed(2)
          ),
        };
      });
    } catch (errRank) {
      const err = errRank as Error;
      console.warn("Falha ranking produtos/top:", err.message);
    }

    let history: Array<Record<string, unknown>> = [];
    if (topRows.length) {
      try {
        const historyStart = new Date(
          refDate.getFullYear(),
          refDate.getMonth() - (productMonths - 1),
          1
        );
        const historyStartYMD = `${historyStart.getFullYear()}-${String(historyStart.getMonth() + 1).padStart(2, "0")}-01`;
        const ids = topRows
          .map((r) => Number(r.produto_id))
          .filter((x) => !Number.isNaN(x));
        if (ids.length) {
          const hq = await database.query({
            text: `WITH series AS (
                     SELECT generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') AS mstart
                   )
                   SELECT to_char(s.mstart,'YYYY-MM') AS month, i.produto_id,
                          COALESCE(SUM(i.total_item),0)::numeric(14,2) AS receita,
                          COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs,
                          (COALESCE(SUM(i.total_item),0) - COALESCE(SUM(i.custo_total_item),0))::numeric(14,2) AS lucro
                   FROM series s
                   LEFT JOIN pedidos pd ON pd.tipo='VENDA' AND pd.data_emissao >= s.mstart AND pd.data_emissao < (s.mstart + interval '1 month')
                   LEFT JOIN pedido_itens i ON i.pedido_id = pd.id AND i.produto_id = ANY($3)
                   GROUP BY s.mstart, i.produto_id
                   ORDER BY s.mstart ASC`,
            values: [historyStartYMD, startYMD, ids],
          });
          const map = new Map<
            number,
            Array<{ month: string; receita: number; cogs: number; lucro: number; margem: number }>
          >();
          for (const r of hq.rows as Array<Record<string, unknown>>) {
            const pid = r.produto_id as number;
            if (!map.has(pid)) map.set(pid, []);
            const receita = Number(r.receita || 0);
            const cogs = Number(r.cogs || 0);
            const lucro = Number(r.lucro || receita - cogs);
            const margem =
              receita > 0 ? Number(((lucro / receita) * 100).toFixed(2)) : 0;
            map.get(pid)!.push({
              month: r.month as string,
              receita,
              cogs,
              lucro,
              margem,
            });
          }
          history = topRows.map((r) => ({
            produto_id: r.produto_id,
            history: map.get(Number(r.produto_id)) || [],
          }));
        }
      } catch (errHist) {
        const err = errHist as Error;
        console.warn("Falha history produtos/top:", err.message);
      }
    }

    res.status(200).json({
      month: label,
      top: topRows,
      history,
      meta: {
        topNRequested: topNRaw || 5,
        topNUsed: topN,
        topNCap: 50,
        productMonthsRequested: productMonthsRaw || 6,
        productMonthsUsed: productMonths,
        productMonthsCap: 24,
      },
    });
  } catch (e) {
    console.error("GET /produtos/top error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e))
      res.status(503).json({
        error: "Schema not migrated (produtos|pedido_itens|pedidos missing)",
        action: "Run migrations",
        code: err.code,
      });
    else if (isConnectionError(e))
      res.status(503).json({
        error: "Database unreachable",
        code: err.code,
      });
    else res.status(500).json({ error: "Internal error" });
  }
}
