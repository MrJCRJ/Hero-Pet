// pages/api/v1/produtos/top.js
// Endpoint dedicado para ranking de produtos por lucro.
// Motivação: permitir consultas independentes do dashboard de pedidos e suportar topN maiores (até 50)
// sem inflar o payload do resumo principal. Útil para telas/análises focadas em mix.
// Parâmetros:
//   month=YYYY-MM (opcional; default mês atual)
//   topN= (default 5, cap 50) — separado do summary para permitir listas maiores controladas
//   productMonths= (default 6, cap 24) — histórico mensal de receita/cogs/lucro dos produtos retornados
// Resposta:
//   {
//     month: 'YYYY-MM',
//     top: [ { produto_id, nome, receita, cogs, lucro, margem, quantidade, lucro_unitario } ],
//     history: [ { produto_id, history: [{ month, receita, cogs, lucro, margem }] } ],
//     meta: { topNRequested, topNUsed, topNCap, productMonthsRequested, productMonthsUsed, productMonthsCap }
//   }
// Erros de colunas ausentes/migração atrasada retornam 503 com action.

import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

function monthBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const ymd = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { startYMD: ymd(start), nextStartYMD: ymd(next), label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}` };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: `Method "${req.method}" not allowed` });
  try {
    const { month } = req.query;
    let refDate = new Date();
    if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      refDate = new Date(y, m - 1, 1);
    }
    const { startYMD, nextStartYMD, label } = monthBounds(refDate);

    const topNRaw = Number(req.query.topN || 5); // maior flexibilidade (cap 50)
    const topN = Math.min(50, Math.max(1, isNaN(topNRaw) ? 5 : topNRaw));
    const productMonthsRaw = Number(req.query.productMonths || 6);
    const productMonths = Math.min(24, Math.max(2, isNaN(productMonthsRaw) ? 6 : productMonthsRaw));

    // Ranking principal
    let topRows = [];
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
      topRows = q.rows.map(r => {
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
    } catch (errRank) {
      console.warn('Falha ranking produtos/top:', errRank.message);
    }

    // Histórico
    let history = [];
    if (topRows.length) {
      try {
        const historyStart = new Date(refDate.getFullYear(), refDate.getMonth() - (productMonths - 1), 1);
        const historyStartYMD = `${historyStart.getFullYear()}-${String(historyStart.getMonth() + 1).padStart(2, '0')}-01`;
        const ids = topRows.map(r => Number(r.produto_id)).filter(x => !Number.isNaN(x));
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
            values: [historyStartYMD, startYMD, ids]
          });
          const map = new Map();
          for (const r of hq.rows) {
            const pid = r.produto_id;
            if (!map.has(pid)) map.set(pid, []);
            const receita = Number(r.receita || 0);
            const cogs = Number(r.cogs || 0);
            const lucro = Number(r.lucro || (receita - cogs));
            const margem = receita > 0 ? Number(((lucro / receita) * 100).toFixed(2)) : 0;
            map.get(pid).push({ month: r.month, receita, cogs, lucro, margem });
          }
          history = topRows.map(r => ({ produto_id: r.produto_id, history: map.get(r.produto_id) || [] }));
        }
      } catch (errHist) {
        console.warn('Falha history produtos/top:', errHist.message);
      }
    }

    return res.status(200).json({
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
    console.error('GET /produtos/top error', e);
    if (isRelationMissing(e))
      return res.status(503).json({ error: 'Schema not migrated (produtos|pedido_itens|pedidos missing)', action: 'Run migrations', code: e.code });
    if (isConnectionError(e))
      return res.status(503).json({ error: 'Database unreachable', code: e.code });
    return res.status(500).json({ error: 'Internal error' });
  }
}
