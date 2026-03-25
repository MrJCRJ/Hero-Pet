import database from "infra/database.js";
import { fetchDadosConsolidado } from "@/lib/relatorios/fetchDadosConsolidado";
import { getReportBounds } from "@/lib/relatorios/dateBounds";
import { parseRelatorioQuery } from "@/lib/relatorios/parseRelatoriosQuery";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function rankingHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const parsed = parseRelatorioQuery(req.query, {
      allowFormat: true,
      allowLimit: true,
      allowTipo: true,
      allowCompare: true,
      defaultLimit: 10,
    });
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { mes, ano, tipo, limit, format } = parsed.data;
    if (format === "pdf" || format === "xlsx") {
      if (res.setHeader) res.setHeader("Deprecation", "true");
      res.status(400).json({ erro: "Use o relatório consolidado em JSON" });
      return;
    }
    const { firstDay, lastDay } = getReportBounds(mes, ano);

    if (tipo === "fornecedores") {
      const result = await database.query({
        text: `SELECT
                 e.id AS entity_id,
                COALESCE(NULLIF(TRIM(MAX(p.partner_name)), ''), e.name) AS nome,
                 COUNT(DISTINCT p.id)::int AS pedidos_count,
                 COALESCE(SUM(p.total_liquido),0)::numeric(14,2) AS total
               FROM entities e
               JOIN pedidos p ON p.partner_entity_id = e.id
               WHERE p.tipo = 'COMPRA' AND p.status = 'confirmado'
                 AND p.data_emissao >= $1 AND p.data_emissao < $2
               GROUP BY e.id, e.name
               ORDER BY total DESC
               LIMIT $3`,
        values: [firstDay, lastDay, limit],
      });

      const ranking = (result.rows as Array<Record<string, unknown>>).map((r) => {
        const nome = r.nome ?? "";
        return {
          entity_id: r.entity_id,
          nome: String(nome).trim() || "Fornecedor sem nome",
          pedidos_count: Number(r.pedidos_count || 0),
          total: Number(r.total || 0),
        };
      });

      const payload = { periodo: { mes, ano, firstDay, lastDay }, tipo: "fornecedores", ranking };
      res.status(200).json(payload);
      return;
    }

    const consolidado = await fetchDadosConsolidado(mes, ano);
    const totalGeral = consolidado.ranking.totalGeral;
    const ranking = consolidado.ranking.itens
      .slice(0, limit ?? 10)
      .map((item) => ({
        entity_id: item.entity_id,
        nome: item.nome,
        pedidos_count: item.pedidos_count ?? 0,
        total: item.total,
        margemBruta: item.margemBruta,
        ticketMedio:
          item.ticketMedio ??
          (item.pedidos_count && item.pedidos_count > 0
            ? Number((item.total / item.pedidos_count).toFixed(2))
            : 0),
        participacaoTotal:
          item.participacaoTotal ??
          (totalGeral > 0 ? Number(((item.total / totalGeral) * 100).toFixed(2)) : 0),
      }));
    const totalPedidosGeral = ranking.reduce(
      (acc, item) => acc + Number(item.pedidos_count || 0),
      0
    );
    const payload = {
      periodo: consolidado.periodo,
      tipo: "vendas",
      ranking,
      totalGeral,
      totalPedidosGeral,
      ticketMedioGeral: totalPedidosGeral > 0 ? Number((totalGeral / totalPedidosGeral).toFixed(2)) : 0,
      ...(consolidado.rankingAnterior ? { rankingAnterior: consolidado.rankingAnterior } : {}),
    };
    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /relatorios/ranking error", e);
    res.status(500).json({ error: "Erro ao gerar ranking" });
  }
}
