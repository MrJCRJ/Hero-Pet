import database from "infra/database.js";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStart(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function dashboardHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const hoje = todayYMD();
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const amanhaYMD = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, "0")}-${String(amanha.getDate()).padStart(2, "0")}`;

    const mesInicio = new Date();
    mesInicio.setDate(1);
    const mesStart = monthStart(mesInicio);
    const mesFim = new Date(mesInicio.getFullYear(), mesInicio.getMonth() + 1, 1);
    const mesEnd = monthStart(mesFim);

    const [vendasHojeR, comprasHojeR, despesasMesR, vendasMesR, comprasMesR] =
      await Promise.all([
        database.query({
          text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
          values: [hoje, amanhaYMD],
        }),
        database.query({
          text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'COMPRA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
          values: [hoje, amanhaYMD],
        }),
        database.query({
          text: `SELECT COALESCE(SUM(valor),0)::numeric(14,2) AS total
               FROM despesas WHERE data_vencimento >= $1 AND data_vencimento < $2`,
          values: [mesStart, mesEnd],
        }),
        database.query({
          text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
          values: [mesStart, mesEnd],
        }),
        database.query({
          text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos WHERE tipo = 'COMPRA' AND status = 'confirmado'
               AND data_emissao >= $1 AND data_emissao < $2`,
          values: [mesStart, mesEnd],
        }),
      ]);

    const vendasHoje = Number((vendasHojeR.rows[0] as Record<string, unknown>)?.total || 0);
    const comprasHoje = Number((comprasHojeR.rows[0] as Record<string, unknown>)?.total || 0);
    const despesasMes = Number((despesasMesR.rows[0] as Record<string, unknown>)?.total || 0);
    const vendasMes = Number((vendasMesR.rows[0] as Record<string, unknown>)?.total || 0);
    const comprasMes = Number((comprasMesR.rows[0] as Record<string, unknown>)?.total || 0);

    const saldoCaixa = Number((vendasMes - comprasMes - despesasMes).toFixed(2));

    const historyMonths = 6;
    const histStart = new Date();
    histStart.setMonth(histStart.getMonth() - historyMonths);
    histStart.setDate(1);
    const histStartYMD = monthStart(histStart);

    const [vendasHistR, comprasHistR, ultimosPedidosR, ultimasDespesasR] =
      await Promise.all([
        database.query({
          text: `WITH series AS (
            SELECT generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') AS mstart
          )
          SELECT to_char(s.mstart,'YYYY-MM') AS month,
                 COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS vendas
          FROM series s
          LEFT JOIN pedidos p ON p.tipo = 'VENDA' AND p.status = 'confirmado'
            AND p.data_emissao >= s.mstart AND p.data_emissao < (s.mstart + interval '1 month')
          GROUP BY s.mstart ORDER BY s.mstart`,
          values: [histStartYMD, mesEnd],
        }),
        database.query({
          text: `WITH series AS (
            SELECT generate_series(date_trunc('month',$1::date), date_trunc('month',$2::date), interval '1 month') AS mstart
          )
          SELECT to_char(s.mstart,'YYYY-MM') AS month,
                 COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS compras
          FROM series s
          LEFT JOIN pedidos p ON p.tipo = 'COMPRA' AND p.status = 'confirmado'
            AND p.data_emissao >= s.mstart AND p.data_emissao < (s.mstart + interval '1 month')
          GROUP BY s.mstart ORDER BY s.mstart`,
          values: [histStartYMD, mesEnd],
        }),
        database.query({
          text: `SELECT id, tipo, data_emissao, total_liquido, partner_name, status
                 FROM pedidos ORDER BY data_emissao DESC LIMIT 10`,
        }),
        database.query({
          text: `SELECT id, descricao, valor, data_vencimento, categoria
                 FROM despesas ORDER BY data_vencimento DESC, created_at DESC LIMIT 10`,
        }),
      ]);

    const vendasByMonth = new Map(
      (vendasHistR.rows as Array<Record<string, unknown>>).map((r) => [
        r.month,
        Number(r.vendas || 0),
      ])
    );
    const comprasByMonth = new Map(
      (comprasHistR.rows as Array<Record<string, unknown>>).map((r) => [
        r.month,
        Number(r.compras || 0),
      ])
    );
    const monthsSet = new Set([...vendasByMonth.keys(), ...comprasByMonth.keys()]);
    const evolucao = Array.from(monthsSet)
      .sort()
      .map((month) => ({
        month,
        vendas: vendasByMonth.get(month) ?? 0,
        compras: comprasByMonth.get(month) ?? 0,
      }));

    const ultimosPedidos = (ultimosPedidosR.rows as Array<Record<string, unknown>>).map(
      (p) => ({
        id: p.id,
        tipo: p.tipo,
        data: p.data_emissao,
        total: Number(p.total_liquido || 0),
        parceiro: p.partner_name,
        status: p.status,
      })
    );

    const ultimasDespesas = (ultimasDespesasR.rows as Array<Record<string, unknown>>).map(
      (d) => ({
        id: d.id,
        descricao: d.descricao,
        valor: Number(d.valor || 0),
        data: d.data_vencimento,
        categoria: d.categoria,
      })
    );

    res.status(200).json({
      cards: {
        vendasHoje,
        comprasHoje,
        despesasMes,
        vendasMes,
        comprasMes,
        saldoCaixa,
      },
      evolucao,
      ultimosPedidos,
      ultimasDespesas,
    });
  } catch (e) {
    console.error("GET /dashboard error", e);
    res.status(500).json({ error: "Erro ao buscar dados do dashboard" });
  }
}
