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

  // =============================
  // Cache em memória (escopo processo)
  // =============================
  // Estrutura: key -> { ts: epoch_ms, data }
  // Chave inclui: month, monthsParam. (Outros filtros podem ser adicionados futuramente)
  // TTL padrão: 60 segundos (reduz queries em navegação entre telas sem introduzir staleness longo).
  // Bypass: adicionar ?nocache=1 à URL.
  // OBS: Em ambiente serverless (Vercel) a utilidade é limitada ao ciclo de vida da lambda/quente.
  // Para cache cross-instance considerar Redis ou layer HTTP (etag/s-maxage).
  const CACHE_TTL_MS = 60 * 1000;
  if (!global.__PEDIDOS_SUMMARY_CACHE__) {
    global.__PEDIDOS_SUMMARY_CACHE__ = new Map();
  }
  const cache = global.__PEDIDOS_SUMMARY_CACHE__;
  const nocache = String(req.query.nocache || "") === "1";

  try {
    // Opcional: permitir query month=YYYY-MM
    const { month } = req.query;
    let refDate = new Date();
    if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      refDate = new Date(y, m - 1, 1);
    }
    const { startYMD, nextStartYMD, prevStartYMD, label } =
      monthBounds(refDate);

    // Histórico de vendas últimos N meses (incluindo mês atual)
    const monthsParam = Math.min(
      24,
      Math.max(3, Number(req.query.months || 12) || 12),
    );

    const cacheKey = JSON.stringify({ month: req.query.month || null, monthsParam });
    if (!nocache) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return res.status(200).json({ ...cached.data, _cache: { hit: true, ttl_ms: CACHE_TTL_MS } });
      }
    }
    // Data inicial = primeiro dia do mês referência - (N-1) meses
    const historyStart = new Date(
      refDate.getFullYear(),
      refDate.getMonth() - (monthsParam - 1),
      1,
    );
    const historyStartYMD = `${historyStart.getFullYear()}-${String(historyStart.getMonth() + 1).padStart(2, "0")}-01`;
    // Consulta agregada usando generate_series para garantir meses com 0
    const vendasHistoryQ = await database.query({
      text: `WITH series AS (
               SELECT generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') AS mstart
             )
             SELECT to_char(s.mstart, 'YYYY-MM') AS month,
                    COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS vendas
             FROM series s
             LEFT JOIN pedidos p
               ON p.tipo = 'VENDA'
              AND p.data_emissao >= s.mstart
              AND p.data_emissao < (s.mstart + interval '1 month')
             GROUP BY s.mstart
             ORDER BY s.mstart`,
      values: [historyStartYMD, startYMD],
    });

    // Histórico de compras (para gráfico similar ao crescimento de vendas)
    const comprasHistoryQ = await database.query({
      text: `WITH series AS (
               SELECT generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') AS mstart
             )
             SELECT to_char(s.mstart, 'YYYY-MM') AS month,
                    COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS compras
             FROM series s
             LEFT JOIN pedidos p
               ON p.tipo = 'COMPRA'
              AND p.data_emissao >= s.mstart
              AND p.data_emissao < (s.mstart + interval '1 month')
             GROUP BY s.mstart
             ORDER BY s.mstart`,
      values: [historyStartYMD, startYMD],
    });

    // Histórico de COGS por mês (itens de venda dentro do mês)
    const cogsHistoryQ = await database.query({
      text: `WITH series AS (
               SELECT generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') AS mstart
             )
             SELECT to_char(s.mstart, 'YYYY-MM') AS month,
                    COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
             FROM series s
             LEFT JOIN pedidos p
               ON p.tipo = 'VENDA'
              AND p.data_emissao >= s.mstart
              AND p.data_emissao < (s.mstart + interval '1 month')
             LEFT JOIN pedido_itens i ON i.pedido_id = p.id
             GROUP BY s.mstart
             ORDER BY s.mstart`,
      values: [historyStartYMD, startYMD],
    });

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

    // Compras do mês anterior (para crescimento de compras)
    const comprasPrevQ = await database.query({
      text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos
             WHERE tipo = 'COMPRA' AND data_emissao >= $1 AND data_emissao < $2`,
      values: [prevStartYMD, startYMD],
    });

    // Vendas do mês anterior (para Crescimento MoM)
    const vendasPrevQ = await database.query({
      text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
             FROM pedidos
             WHERE tipo = 'VENDA' AND data_emissao >= $1 AND data_emissao < $2`,
      values: [prevStartYMD, startYMD],
    });

    // COGS real do mês: soma dos custos totalizados por item de venda dentro do período
    const cogsQ = await database.query({
      text: `SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
             FROM pedido_itens i
             JOIN pedidos p ON p.id = i.pedido_id
             WHERE p.tipo = 'VENDA' AND p.data_emissao >= $1 AND p.data_emissao < $2`,
      values: [startYMD, nextStartYMD],
    });

    // -------------------------------------------------------------
    // Top produtos mais lucrativos no mês corrente
    // ------------------------------------------------------------------
    // Este bloco adiciona inteligência de produto ao resumo financeiro.
    // Objetivo: responder rapidamente à pergunta “qual ração (produto) gerou mais lucro no mês?”.
    // Estratégia: agregação por produto considerando apenas pedidos de VENDA emitidos dentro do intervalo mensal.
    // - Receita: soma de total_item (já líquido de desconto unitário na origem de cálculo)
    // - COGS: soma de custo_total_item (derivado do custo unitário reconhecido no momento da venda)
    // - Lucro: Receita - COGS
    // - Margem%: (Lucro / Receita) * 100 (0 quando Receita = 0 para evitar divisão por zero)
    // - Qtd: soma das quantidades vendidas (numeric escalado no banco)
    // - Lucro Unitário: Lucro / Qtd (guard rails dividindo por 1 se Qtd=0 — caso raro)
    // Retornamos os 5 primeiros (ordenados por lucro desc, depois receita) para equilibrar utilidade e payload enxuto.
    // Falhas neste bloco (ex.: deploy parcial sem colunas) não quebram o resumo principal — capturamos exceção e logamos warning.
    // Regra: considerar apenas pedidos de VENDA emitidos no mês.
    // Receita = SUM(pedido_itens.total_item)
    // COGS    = SUM(pedido_itens.custo_total_item) (pode haver nulos caso itens antigos sem custo)
    // Lucro   = Receita - COGS
    // Margem% = (Lucro / Receita) * 100 (guard rails para Receita==0)
    // Exposto:
    //   topProdutoLucro: primeiro da lista (ou null)
    //   topProdutosLucro: array (limit 5)
    // Observação: usamos LIMIT 5 para payload enxuto; modal pode exibir exatamente estes 5.
    // Futuro: permitir parametrizar N via query (?topN=10) mantendo limite máximo.
    // Parametrização: ?topN= (default 5, mínimo 1, máximo 20)
    const topNRaw = Number(req.query.topN || 5);
    const topN = Math.min(20, Math.max(1, isNaN(topNRaw) ? 5 : topNRaw));
    let topProdutosRows = [];
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
               WHERE pdr.tipo = 'VENDA'
                 AND pdr.data_emissao >= $1 AND pdr.data_emissao < $2
               GROUP BY i.produto_id, p.nome
               HAVING COALESCE(SUM(i.total_item),0) > 0
               ORDER BY lucro DESC, receita DESC
               LIMIT ${topN}`,
        values: [startYMD, nextStartYMD],
      });
      topProdutosRows = topProdutosQ.rows.map(r => {
        const receita = Number(r.receita || 0);
        const cogs = Number(r.cogs || 0);
        const lucro = Number(r.lucro || 0);
        const margem = receita > 0 ? Number(((lucro / receita) * 100).toFixed(2)) : 0;
        return {
          produto_id: r.produto_id,
          nome: r.nome,
          receita,
          cogs,
          lucro,
          margem,
          quantidade: Number(r.quantidade || 0),
          lucro_unitario: Number((lucro / (Number(r.quantidade) || 1)).toFixed(2)),
        };
      });
    } catch (errTop) {
      // Não falha o endpoint inteiro se a agregação de produtos quebrar (ex.: coluna ausente em deploy parcial)
      console.warn('Falha agregação top produtos lucro:', errTop.message);
    }

    // Histórico mensal (lucro/receita/cogs) para cada produto do ranking
    // Parametrização: ?productMonths= (default 6, cap 24, min 2)
    const productMonthsRaw = Number(req.query.productMonths || 6);
    const productMonths = Math.min(24, Math.max(2, isNaN(productMonthsRaw) ? 6 : productMonthsRaw));
    let topProdutosHistory = [];
    if (topProdutosRows.length) {
      try {
        // Geramos série de meses retroativos terminando no mês de referência para JOIN
        const historyStartProd = new Date(refDate.getFullYear(), refDate.getMonth() - (productMonths - 1), 1);
        const historyStartProdYMD = `${historyStartProd.getFullYear()}-${String(historyStartProd.getMonth() + 1).padStart(2, '0')}-01`;
        const idsList = topProdutosRows.map(r => Number(r.produto_id)).filter(x => !Number.isNaN(x));
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
                   LEFT JOIN pedidos p ON p.tipo='VENDA' AND p.data_emissao >= s.mstart AND p.data_emissao < (s.mstart + interval '1 month')
                   LEFT JOIN pedido_itens i ON i.pedido_id = p.id AND i.produto_id = ANY($3)
                   GROUP BY s.mstart, i.produto_id
                   ORDER BY s.mstart ASC` ,
            values: [historyStartProdYMD, startYMD, idsList],
          });
          // Organiza em estrutura: { produto_id, history: [{month, receita, cogs, lucro, margem}] }
          const byProd = new Map();
          for (const r of prodHistQ.rows) {
            const pid = r.produto_id;
            if (!byProd.has(pid)) byProd.set(pid, []);
            const receita = Number(r.receita || 0);
            const cogs = Number(r.cogs || 0);
            const lucro = Number(r.lucro || (receita - cogs));
            const margem = receita > 0 ? Number(((lucro / receita) * 100).toFixed(2)) : 0;
            byProd.get(pid).push({ month: r.month, receita, cogs, lucro, margem });
          }
          topProdutosHistory = topProdutosRows.map(prod => ({
            produto_id: prod.produto_id,
            history: byProd.get(prod.produto_id) || []
          }));
        }
      } catch (errHist) {
        console.warn('Falha agregação histórico top produtos:', errHist.message);
      }
    }

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

    const vendasMes = Number(vendasQ.rows[0]?.total || 0);
    const comprasMes = Number(comprasQ.rows[0]?.total || 0);
    const comprasMesAnterior = Number(comprasPrevQ.rows[0]?.total || 0);
    const vendasMesAnterior = Number(vendasPrevQ.rows[0]?.total || 0);
    const cogsReal = Number(cogsQ.rows[0]?.cogs || 0);
    const lucroBrutoMes = Number((vendasMes - cogsReal).toFixed(2));
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
          ).toFixed(2),
        )
        : null;

    const crescimentoComprasMoMPerc =
      comprasMesAnterior > 0
        ? Number(
          (
            ((comprasMes - comprasMesAnterior) / comprasMesAnterior) *
            100
          ).toFixed(2),
        )
        : null;

    // Monta growthHistory com crescimento percentual mês a mês
    const cogsByMonth = new Map(
      cogsHistoryQ.rows.map((r) => [r.month, Number(r.cogs || 0)]),
    );
    const growthHistory = vendasHistoryQ.rows.map((r, idx, arr) => {
      const vendas = Number(r.vendas || 0);
      const cogsHist = cogsByMonth.get(r.month) || 0;
      const lucro = Number((vendas - cogsHist).toFixed(2));
      const margem =
        vendas > 0 ? Number(((lucro / vendas) * 100).toFixed(2)) : 0;
      const prev = idx > 0 ? Number(arr[idx - 1].vendas || 0) : null;
      const crescimento =
        prev && prev > 0
          ? Number((((vendas - prev) / prev) * 100).toFixed(2))
          : null;
      return { month: r.month, vendas, cogs: cogsHist, lucro, margem, crescimento };
    });

    const comprasHistory = comprasHistoryQ.rows.map((r, idx, arr) => {
      const compras = Number(r.compras || 0);
      const prev = idx > 0 ? Number(arr[idx - 1].compras || 0) : null;
      const crescimento = prev && prev > 0 ? Number((((compras - prev) / prev) * 100).toFixed(2)) : null;
      return { month: r.month, compras, crescimento };
    });

    const responsePayload = {
      month: label,
      vendasMes,
      vendasMesAnterior,
      crescimentoMoMPerc,
      comprasMes,
      comprasMesAnterior,
      crescimentoComprasMoMPerc,
      cogsReal,
      lucroBrutoMes,
      margemBrutaPerc,
      growthHistory,
      comprasHistory,
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
      topProdutoLucro: topProdutosRows[0] || null,
      topProdutosLucro: topProdutosRows,
      _topProdutosMeta: { topNRequested: topNRaw || 5, topNUsed: topN, cap: 20 },
      topProdutosHistory,
      _topProdutosHistoryMeta: { productMonthsRequested: productMonthsRaw || 6, productMonthsUsed: productMonths, cap: 24 },
    };

    // Grava no cache (mesmo se nocache=1 para facilitar warm-up manual) mas só marca hit se servido do cache.
    cache.set(cacheKey, { ts: Date.now(), data: responsePayload });
    return res.status(200).json({ ...responsePayload, _cache: { hit: false, ttl_ms: CACHE_TTL_MS } });
  } catch (e) {
    console.error("GET /pedidos/summary error", e);
    if (isRelationMissing(e))
      return res.status(503).json({
        error:
          "Schema not migrated (pedidos|pedido_itens|pedido_promissorias missing)",
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
