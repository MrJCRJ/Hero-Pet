import database from "infra/database.js";
import { gerarRankingPDF } from "@/lib/relatorios/exportPDF";
import { gerarRankingExcel } from "@/lib/relatorios/exportExcel";
import { getReportBounds, periodoFilename } from "@/lib/relatorios/dateBounds";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

type ResWithHeaders = ApiResLike & { setHeader: (name: string, value: string) => void; end: (chunk?: unknown) => void };

export default async function rankingHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const now = new Date();
    const mes = Number(req.query?.mes) ?? now.getMonth() + 1;
    const ano = Number(req.query?.ano) ?? now.getFullYear();
    const tipo = (req.query?.tipo as string) || "vendas"; // vendas | fornecedores
    const format = (req.query?.format as string) || "json";
    const defaultLimit = format === "pdf" || format === "xlsx" ? 30 : 10;
    const limit = Math.min(100, Math.max(5, Number(req.query?.limit) || defaultLimit));
    const { firstDay, lastDay } = getReportBounds(mes, ano);

    if (tipo === "fornecedores") {
      const result = await database.query({
        text: `SELECT
                 e.id AS entity_id,
                 COALESCE(NULLIF(TRIM(MAX(p.partner_name)), ''), e.name) AS nome,
                 COUNT(DISTINCT p.id)::int AS pedidos_count,
                 COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS total
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
      if (format === "pdf") {
        gerarRankingPDF(payload, res as ResWithHeaders);
        return;
      }
      if (format === "xlsx") {
        const buffer = await gerarRankingExcel(payload);
        (res as ResWithHeaders).setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        (res as ResWithHeaders).setHeader("Content-Disposition", `attachment; filename="Ranking-fornecedores-${ano}-${String(mes).padStart(2, "0")}.xlsx"`);
        (res as ResWithHeaders).status(200);
        (res as ResWithHeaders).end(buffer);
        return;
      }
      res.status(200).json(payload);
      return;
    }

    // ranking de vendas (clientes) com margem bruta
    // Usar CTE para evitar duplicação: LEFT JOIN pedido_itens multiplica linhas e inflava totais
    const [result, totalGeralR] = await Promise.all([
      database.query({
        text: `WITH totais_por_entity AS (
                 SELECT p.partner_entity_id,
                   COUNT(DISTINCT p.id)::int AS pedidos_count,
                   COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS total
                 FROM pedidos p
                 WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
                   AND p.data_emissao >= $1 AND p.data_emissao < $2
                   AND p.partner_entity_id IS NOT NULL
                 GROUP BY p.partner_entity_id
               ),
               cogs_por_entity AS (
                 SELECT p.partner_entity_id,
                   COALESCE(SUM(pi.custo_total_item),0)::numeric(14,2) AS cogs
                 FROM pedido_itens pi
                 JOIN pedidos p ON p.id = pi.pedido_id
                 WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
                   AND p.data_emissao >= $1 AND p.data_emissao < $2
                 GROUP BY p.partner_entity_id
               )
               SELECT
                 e.id AS entity_id,
                 COALESCE(NULLIF(TRIM(MAX(p.partner_name)), ''), e.name) AS nome,
                 t.pedidos_count,
                 t.total,
                 COALESCE(c.cogs, 0)::numeric(14,2) AS cogs
               FROM entities e
               JOIN totais_por_entity t ON t.partner_entity_id = e.id
               LEFT JOIN cogs_por_entity c ON c.partner_entity_id = e.id
               LEFT JOIN pedidos p ON p.partner_entity_id = e.id
                 AND p.tipo = 'VENDA' AND p.status = 'confirmado'
                 AND p.data_emissao >= $1 AND p.data_emissao < $2
               GROUP BY e.id, e.name, t.pedidos_count, t.total, c.cogs
               ORDER BY t.total DESC
               LIMIT $3`,
        values: [firstDay, lastDay, limit],
      }),
      database.query({
        text: `SELECT
                 COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS total,
                 COUNT(DISTINCT p.id)::int AS pedidos_count
               FROM pedidos p
               WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
                 AND p.data_emissao >= $1 AND p.data_emissao < $2`,
        values: [firstDay, lastDay],
      }),
    ]);

    const totalGeral = Number((totalGeralR.rows[0] as Record<string, unknown>)?.total || 0);
    const totalPedidosGeral = Number((totalGeralR.rows[0] as Record<string, unknown>)?.pedidos_count || 0);

    const ranking = (result.rows as Array<Record<string, unknown>>).map((r) => {
      const total = Number(r.total || 0);
      const cogs = Number(r.cogs || 0);
      const pedidosCount = Number(r.pedidos_count || 0);
      const nome = r.nome ?? "";
      const margemBruta = total > 0 && cogs > 0
        ? Number(((total - cogs) / total * 100).toFixed(2))
        : null;
      const ticketMedio = pedidosCount > 0 ? Number((total / pedidosCount).toFixed(2)) : 0;
      const participacaoTotal = totalGeral > 0 ? Number((total / totalGeral * 100).toFixed(2)) : 0;
      return {
        entity_id: r.entity_id,
        nome: String(nome).trim() || "Cliente sem nome",
        pedidos_count: pedidosCount,
        total,
        margemBruta,
        ticketMedio,
        participacaoTotal,
      };
    });

    const compare = req.query?.compare === "1" || req.query?.compare === "ano_anterior";
    const incluirComparacao = (format === "json" && compare) || (format !== "json" && mes > 0 && ano > 0);
    let rankingAnterior: { totalGeral: number } | null = null;
    if (incluirComparacao) {
      const anoAnt = ano - 1;
      const { firstDay: fa, lastDay: la } = getReportBounds(mes, anoAnt);
      const antR = await database.query({
        text: `SELECT COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS total
               FROM pedidos p WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
               AND p.data_emissao >= $1 AND p.data_emissao < $2`,
        values: [fa, la],
      });
      const totalAnterior = Number((antR.rows[0] as Record<string, unknown>)?.total || 0);
      rankingAnterior = { totalGeral: totalAnterior };
    }
    const payload = {
      periodo: { mes, ano, firstDay, lastDay },
      tipo: "vendas",
      ranking,
      totalGeral,
      totalPedidosGeral,
      ticketMedioGeral: totalPedidosGeral > 0 ? Number((totalGeral / totalPedidosGeral).toFixed(2)) : 0,
      ...(rankingAnterior ? { rankingAnterior } : {}),
    };
    if (format === "pdf") {
      gerarRankingPDF(payload, res as ResWithHeaders);
      return;
    }
    if (format === "xlsx") {
      const buffer = await gerarRankingExcel(payload);
      (res as ResWithHeaders).setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      (res as ResWithHeaders).setHeader("Content-Disposition", `attachment; filename="Ranking-vendas-${periodoFilename(mes, ano)}.xlsx"`);
      (res as ResWithHeaders).status(200);
      (res as ResWithHeaders).end(buffer);
      return;
    }
    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /relatorios/ranking error", e);
    res.status(500).json({ error: "Erro ao gerar ranking" });
  }
}
