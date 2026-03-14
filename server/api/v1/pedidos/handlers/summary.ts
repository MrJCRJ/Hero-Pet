import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

declare global {
  // eslint-disable-next-line no-var
  var __PEDIDOS_SUMMARY_CACHE__: Map<
    string,
    { ts: number; data: Record<string, unknown> }
  > | undefined;
}

function monthBounds(d: Date = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const nextStart = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const ymd = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return {
    startYMD: ymd(start),
    nextStartYMD: ymd(nextStart),
    prevStartYMD: ymd(prevStart),
    label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}

export async function getSummaryHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  const CACHE_TTL_MS = 60 * 1000;
  if (!global.__PEDIDOS_SUMMARY_CACHE__) {
    global.__PEDIDOS_SUMMARY_CACHE__ = new Map();
  }
  const cache = global.__PEDIDOS_SUMMARY_CACHE__;
  const nocache = String(req.query?.nocache || "") === "1";

  try {
    const month = req.query?.month;
    let refDate = new Date();
    let startYMD: string;
    let nextStartYMD: string;
    let prevStartYMD: string;
    let label: string;

    if (typeof month === "string" && month === "all") {
      startYMD = "2000-01-01";
      nextStartYMD = "2031-01-01";
      prevStartYMD = "2000-01-01";
      label = "Todos";
    } else if (typeof month === "string" && /^\d{4}$/.test(month)) {
      const y = Number(month);
      startYMD = `${y}-01-01`;
      nextStartYMD = `${y + 1}-01-01`;
      prevStartYMD = `${y - 1}-01-01`;
      label = String(y);
    } else if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      refDate = new Date(y, m - 1, 1);
      const b = monthBounds(refDate);
      startYMD = b.startYMD;
      nextStartYMD = b.nextStartYMD;
      prevStartYMD = b.prevStartYMD;
      label = b.label;
    } else {
      const b = monthBounds(refDate);
      startYMD = b.startYMD;
      nextStartYMD = b.nextStartYMD;
      prevStartYMD = b.prevStartYMD;
      label = b.label;
    }

    const monthsParam = Math.min(
      24,
      Math.max(3, Number(req.query?.months || 12) || 12)
    );

    const cacheKey = JSON.stringify({
      month: req.query?.month || null,
      monthsParam,
    });
    if (!nocache) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        res.status(200).json({
          ...cached.data,
          _cache: { hit: true, ttl_ms: CACHE_TTL_MS },
        });
        return;
      }
    }

    let historyStartYMD: string;
    let historyEndYMD: string;
    if (typeof month === "string" && month === "all") {
      const d = new Date();
      const h = new Date(d.getFullYear(), d.getMonth() - monthsParam, 1);
      historyStartYMD = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-01`;
      historyEndYMD = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (typeof month === "string" && /^\d{4}$/.test(month)) {
      const y = Number(month);
      historyStartYMD = `${y - 1}-01-01`;
      historyEndYMD = startYMD;
    } else {
      const historyStart = new Date(
        refDate.getFullYear(),
        refDate.getMonth() - (monthsParam - 1),
        1
      );
      historyStartYMD = `${historyStart.getFullYear()}-${String(historyStart.getMonth() + 1).padStart(2, "0")}-01`;
      historyEndYMD = startYMD;
    }

    const vendasHistoryQ = await database.query({
      text: `WITH series AS (
               SELECT generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') AS mstart
             )
             SELECT to_char(s.mstart, 'YYYY-MM') AS month,
                    COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS vendas
             FROM series s
             LEFT JOIN pedidos p
               ON p.tipo = 'VENDA' AND p.status = 'confirmado'
              AND p.data_emissao >= s.mstart
              AND p.data_emissao < (s.mstart + interval '1 month')
             GROUP BY s.mstart
             ORDER BY s.mstart`,
      values: [historyStartYMD, historyEndYMD],
    });

    const comprasHistoryQ = await database.query({
      text: `WITH series AS (
               SELECT generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') AS mstart
             )
             SELECT to_char(s.mstart, 'YYYY-MM') AS month,
                    COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS compras
             FROM series s
             LEFT JOIN pedidos p
               ON p.tipo = 'COMPRA' AND p.status = 'confirmado'
              AND p.data_emissao >= s.mstart
              AND p.data_emissao < (s.mstart + interval '1 month')
             GROUP BY s.mstart
             ORDER BY s.mstart`,
      values: [historyStartYMD, historyEndYMD],
    });

    const cogsHistoryQ = await database.query({
      text: `WITH series AS (
               SELECT generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') AS mstart
             )
             SELECT to_char(s.mstart, 'YYYY-MM') AS month,
                    COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
             FROM series s
             LEFT JOIN pedidos p
               ON p.tipo = 'VENDA' AND p.status = 'confirmado'
              AND p.data_emissao >= s.mstart
              AND p.data_emissao < (s.mstart + interval '1 month')
             LEFT JOIN pedido_itens i ON i.pedido_id = p.id
             GROUP BY s.mstart
             ORDER BY s.mstart`,
      values: [historyStartYMD, historyEndYMD],
    });

    const vendasQ = await database.query({
      text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos
             WHERE tipo = 'VENDA' AND status = 'confirmado' AND data_emissao >= $1 AND data_emissao < $2`,
      values: [startYMD, nextStartYMD],
    });
    const comprasQ = await database.query({
      text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos
             WHERE tipo = 'COMPRA' AND status = 'confirmado' AND data_emissao >= $1 AND data_emissao < $2`,
      values: [startYMD, nextStartYMD],
    });

    const comprasPrevQ = await database.query({
      text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos
             WHERE tipo = 'COMPRA' AND status = 'confirmado' AND data_emissao >= $1 AND data_emissao < $2`,
      values: [prevStartYMD, startYMD],
    });

    const vendasPrevQ = await database.query({
      text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos
             WHERE tipo = 'VENDA' AND status = 'confirmado' AND data_emissao >= $1 AND data_emissao < $2`,
      values: [prevStartYMD, startYMD],
    });

    const cogsQ = await database.query({
      text: `SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
             FROM pedido_itens i
             JOIN pedidos p ON p.id = i.pedido_id
             WHERE p.tipo = 'VENDA' AND p.status = 'confirmado' AND p.data_emissao >= $1 AND p.data_emissao < $2`,
      values: [startYMD, nextStartYMD],
    });

    const despesasQ = await database.query({
      text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
             FROM despesas
             WHERE data_vencimento >= $1 AND data_vencimento < $2`,
      values: [startYMD, nextStartYMD],
    });

    const topNRaw = Number(req.query?.topN || 5);
    const topN = Math.min(20, Math.max(1, isNaN(topNRaw) ? 5 : topNRaw));
    let topProdutosRows: Array<Record<string, unknown>> = [];
    try {
      const topProdutosQ = await database.query({
        text: `SELECT
                 i.produto_id,
                 p.nome,
                 COALESCE(SUM(i.total_item),0)::numeric(14,2) AS receita,
                 COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs,
                 (COALESCE(SUM(i.total_item),0) - COALESCE(SUM(i.custo_total_item),0))::numeric(14,2) AS lucro,
                 COALESCE(SUM(i.quantidade),0)::numeric(14,3) AS quantidade
               FROM pedido_itens i
               JOIN pedidos pdr ON pdr.id = i.pedido_id
               JOIN produtos p ON p.id = i.produto_id
               WHERE pdr.tipo = 'VENDA' AND pdr.status = 'confirmado'
                 AND pdr.data_emissao >= $1 AND pdr.data_emissao < $2
               GROUP BY i.produto_id, p.nome
               HAVING COALESCE(SUM(i.total_item),0) > 0
               ORDER BY lucro DESC, receita DESC
               LIMIT ${topN}`,
        values: [startYMD, nextStartYMD],
      });
      topProdutosRows = (topProdutosQ.rows as Array<Record<string, unknown>>).map(
        (r) => {
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
        }
      );
    } catch (errTop) {
      const e = errTop as Error;
      console.warn("Falha agregação top produtos lucro:", e.message);
    }

    const productMonthsRaw = Number(req.query?.productMonths || 6);
    const productMonths = Math.min(
      24,
      Math.max(2, isNaN(productMonthsRaw) ? 6 : productMonthsRaw)
    );
    let topProdutosHistory: Array<Record<string, unknown>> = [];
    if (topProdutosRows.length) {
      try {
        let historyStartProdYMD: string;
        let historyEndProdYMD: string;
        if (typeof month === "string" && month === "all") {
          const d = new Date();
          const h = new Date(d.getFullYear(), d.getMonth() - productMonths, 1);
          historyStartProdYMD = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-01`;
          historyEndProdYMD = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        } else if (typeof month === "string" && /^\d{4}$/.test(month)) {
          const y = Number(month);
          historyStartProdYMD = `${y}-01-01`;
          historyEndProdYMD = nextStartYMD;
        } else {
          const historyStartProd = new Date(
            refDate.getFullYear(),
            refDate.getMonth() - (productMonths - 1),
            1
          );
          historyStartProdYMD = `${historyStartProd.getFullYear()}-${String(historyStartProd.getMonth() + 1).padStart(2, "0")}-01`;
          historyEndProdYMD = startYMD;
        }
        const idsList = topProdutosRows
          .map((r) => Number(r.produto_id))
          .filter((x) => !Number.isNaN(x));
        if (idsList.length) {
          const prodHistQ = await database.query({
            text: `WITH series AS (
                     SELECT generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') AS mstart
                   )
                   SELECT to_char(s.mstart,'YYYY-MM') AS month,
                          i.produto_id,
                          COALESCE(SUM(i.total_item),0)::numeric(14,2) AS receita,
                          COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs,
                          (COALESCE(SUM(i.total_item),0) - COALESCE(SUM(i.custo_total_item),0))::numeric(14,2) AS lucro
                   FROM series s
                   LEFT JOIN pedidos p ON p.tipo='VENDA' AND p.status='confirmado' AND p.data_emissao >= s.mstart AND p.data_emissao < (s.mstart + interval '1 month')
                   LEFT JOIN pedido_itens i ON i.pedido_id = p.id AND i.produto_id = ANY($3)
                   GROUP BY s.mstart, i.produto_id
                   ORDER BY s.mstart ASC`,
            values: [historyStartProdYMD, historyEndProdYMD, idsList],
          });
          const byProd = new Map<
            number,
            Array<{
              month: string;
              receita: number;
              cogs: number;
              lucro: number;
              margem: number;
            }>
          >();
          for (const r of prodHistQ.rows as Array<Record<string, unknown>>) {
            const pid = r.produto_id as number;
            if (!byProd.has(pid)) byProd.set(pid, []);
            const receita = Number(r.receita || 0);
            const cogs = Number(r.cogs || 0);
            const lucro = Number(r.lucro || receita - cogs);
            const margem =
              receita > 0 ? Number(((lucro / receita) * 100).toFixed(2)) : 0;
            byProd
              .get(pid)!
              .push({
                month: r.month as string,
                receita,
                cogs,
                lucro,
                margem,
              });
          }
          topProdutosHistory = topProdutosRows.map((prod) => ({
            produto_id: prod.produto_id,
            history: byProd.get(Number(prod.produto_id)) || [],
          }));
        }
      } catch (errHist) {
        const e = errHist as Error;
        console.warn("Falha agregação histórico top produtos:", e.message);
      }
    }

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
      new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1)
    );
    const promNext = await database.query({
      text: `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric(14,2) AS valor
             FROM pedido_promissorias
             WHERE paid_at IS NULL AND due_date >= $1 AND due_date < $2`,
      values: [nextMonthBounds.startYMD, nextMonthBounds.nextStartYMD],
    });

    const promCarry = await database.query({
      text: `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric(14,2) AS valor
             FROM pedido_promissorias
             WHERE paid_at IS NULL AND due_date < $1`,
      values: [startYMD],
    });

    const vendasMes = Number(
      (vendasQ.rows[0] as Record<string, unknown>)?.total || 0
    );
    const comprasMes = Number(
      (comprasQ.rows[0] as Record<string, unknown>)?.total || 0
    );
    const comprasMesAnterior = Number(
      (comprasPrevQ.rows[0] as Record<string, unknown>)?.total || 0
    );
    let vendasMesAnterior = Number(
      (vendasPrevQ.rows[0] as Record<string, unknown>)?.total || 0
    );
    try {
      if (vendasMesAnterior === 0) {
        const prevMonthLabel = prevStartYMD.slice(0, 7);
        const prevHist = (
          vendasHistoryQ.rows as Array<Record<string, unknown>>
        ).find((r) => r.month === prevMonthLabel);
        if (prevHist) {
          const histVal = Number(prevHist.vendas || 0);
          if (histVal > 0) vendasMesAnterior = histVal;
        }
      }
    } catch {
      /* noop */
    }

    const cogsReal = Number(
      (cogsQ.rows[0] as Record<string, unknown>)?.cogs || 0
    );
    const despesasMes = Number(
      (despesasQ.rows[0] as Record<string, unknown>)?.total || 0
    );
    const lucroBrutoMes = Number((vendasMes - cogsReal).toFixed(2));
    const lucroOperacionalMes = Number(
      (lucroBrutoMes - despesasMes).toFixed(2)
    );
    const margemOperacionalPerc =
      vendasMes > 0
        ? Number(((lucroOperacionalMes / vendasMes) * 100).toFixed(2))
        : 0;
    const margemBrutaPerc =
      vendasMes > 0
        ? Number((((vendasMes - cogsReal) / vendasMes) * 100).toFixed(2))
        : 0;
    const crescimentoMoMPerc =
      vendasMesAnterior > 0
        ? Number(
            (
              ((vendasMes - vendasMesAnterior) / vendasMesAnterior) *
              100
            ).toFixed(2)
          )
        : null;

    const crescimentoComprasMoMPerc =
      comprasMesAnterior > 0
        ? Number(
            (
              ((comprasMes - comprasMesAnterior) / comprasMesAnterior) *
              100
            ).toFixed(2)
          )
        : null;

    const cogsByMonth = new Map(
      (cogsHistoryQ.rows as Array<Record<string, unknown>>).map((r) => [
        r.month,
        Number(r.cogs || 0),
      ])
    );
    const growthHistory = (
      vendasHistoryQ.rows as Array<Record<string, unknown>>
    ).map((r, idx, arr) => {
      const vendas = Number(r.vendas || 0);
      const cogsHist = cogsByMonth.get(r.month as string) || 0;
      const lucro = Number((vendas - cogsHist).toFixed(2));
      const margem =
        vendas > 0 ? Number(((lucro / vendas) * 100).toFixed(2)) : 0;
      const prev =
        idx > 0 ? Number((arr[idx - 1] as Record<string, unknown>).vendas || 0) : null;
      const crescimento =
        prev && prev > 0
          ? Number((((vendas - prev) / prev) * 100).toFixed(2))
          : null;
      return { month: r.month, vendas, cogs: cogsHist, lucro, margem, crescimento };
    });

    const comprasHistory = (
      comprasHistoryQ.rows as Array<Record<string, unknown>>
    ).map((r, idx, arr) => {
      const compras = Number(r.compras || 0);
      const prev =
        idx > 0
          ? Number((arr[idx - 1] as Record<string, unknown>).compras || 0)
          : null;
      const crescimento =
        prev && prev > 0
          ? Number((((compras - prev) / prev) * 100).toFixed(2))
          : null;
      return { month: r.month, compras, crescimento };
    });

    const promRow = promMesQ.rows[0] as Record<string, unknown> | undefined;
    const promNextRow = promNext.rows[0] as Record<string, unknown> | undefined;
    const promCarryRow = promCarry.rows[0] as Record<string, unknown> | undefined;

    const responsePayload: Record<string, unknown> = {
      month: label,
      vendasMes,
      vendasMesAnterior,
      crescimentoMoMPerc,
      comprasMes,
      comprasMesAnterior,
      crescimentoComprasMoMPerc,
      cogsReal,
      despesasMes,
      lucroBrutoMes,
      lucroOperacionalMes,
      margemOperacionalPerc,
      margemBrutaPerc,
      growthHistory,
      comprasHistory,
      promissorias: {
        mesAtual: {
          pagos: { count: promRow?.pagos_count || 0, valor: Number(promRow?.pagos_valor || 0) },
          pendentes: {
            count: promRow?.pendentes_count || 0,
            valor: Number(promRow?.pendentes_valor || 0),
          },
          atrasados: {
            count: promRow?.atrasados_count || 0,
            valor: Number(promRow?.atrasados_valor || 0),
          },
        },
        proximoMes: {
          pendentes: {
            count: promNextRow?.count || 0,
            valor: Number(promNextRow?.valor || 0),
          },
        },
        deMesesAnteriores: {
          emAberto: {
            count: promCarryRow?.count || 0,
            valor: Number(promCarryRow?.valor || 0),
          },
        },
      },
      topProdutoLucro: topProdutosRows[0] || null,
      topProdutosLucro: topProdutosRows,
      _topProdutosMeta: {
        topNRequested: topNRaw || 5,
        topNUsed: topN,
        cap: 20,
      },
      topProdutosHistory,
      _topProdutosHistoryMeta: {
        productMonthsRequested: productMonthsRaw || 6,
        productMonthsUsed: productMonths,
        cap: 24,
      },
    };

    cache.set(cacheKey, { ts: Date.now(), data: responsePayload });
    res.status(200).json({
      ...responsePayload,
      _cache: { hit: false, ttl_ms: CACHE_TTL_MS },
    });
  } catch (e) {
    console.error("GET /pedidos/summary error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e))
      res.status(503).json({
        error:
          "Schema not migrated (pedidos|pedido_itens|pedido_promissorias missing)",
        dependency: "database",
        code: err.code,
        action: "Run migrations",
      });
    else if (isConnectionError(e))
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
      });
    else res.status(500).json({ error: "Internal error" });
  }
}
