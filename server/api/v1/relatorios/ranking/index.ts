import database from "infra/database.js";
import { gerarRankingPDF } from "@/lib/relatorios/exportPDF";
import { gerarRankingExcel } from "@/lib/relatorios/exportExcel";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

type ResWithHeaders = ApiResLike & { setHeader: (name: string, value: string) => void; end: (chunk?: unknown) => void };

function monthBounds(mes: number, ano: number) {
  const firstDay = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;
  const lastDay = `${nextAno}-${String(nextMes).padStart(2, "0")}-01`;
  return { firstDay, lastDay };
}

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
    const mes = Number(req.query?.mes) || now.getMonth() + 1;
    const ano = Number(req.query?.ano) || now.getFullYear();
    const tipo = (req.query?.tipo as string) || "vendas"; // vendas | fornecedores
    const limit = Math.min(30, Math.max(5, Number(req.query?.limit) || 10));
    const { firstDay, lastDay } = monthBounds(mes, ano);

    if (tipo === "fornecedores") {
      const result = await database.query({
        text: `SELECT
                 e.id AS entity_id,
                 e.name AS nome,
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

      const ranking = (result.rows as Array<Record<string, unknown>>).map((r) => ({
        entity_id: r.entity_id,
        nome: r.nome,
        pedidos_count: Number(r.pedidos_count || 0),
        total: Number(r.total || 0),
      }));

      const format = (req.query?.format as string) || "json";
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

    // ranking de vendas (clientes)
    const result = await database.query({
      text: `SELECT
               e.id AS entity_id,
               e.name AS nome,
               COUNT(DISTINCT p.id)::int AS pedidos_count,
               COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total,0)),0)::numeric(14,2) AS total
             FROM entities e
             JOIN pedidos p ON p.partner_entity_id = e.id
             WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
               AND p.data_emissao >= $1 AND p.data_emissao < $2
             GROUP BY e.id, e.name
             ORDER BY total DESC
             LIMIT $3`,
      values: [firstDay, lastDay, limit],
    });

    const ranking = (result.rows as Array<Record<string, unknown>>).map((r) => ({
      entity_id: r.entity_id,
      nome: r.nome,
      pedidos_count: Number(r.pedidos_count || 0),
      total: Number(r.total || 0),
    }));

    const format = (req.query?.format as string) || "json";
    const payload = { periodo: { mes, ano, firstDay, lastDay }, tipo: "vendas", ranking };
    if (format === "pdf") {
      gerarRankingPDF(payload, res as ResWithHeaders);
      return;
    }
    if (format === "xlsx") {
      const buffer = await gerarRankingExcel(payload);
      (res as ResWithHeaders).setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      (res as ResWithHeaders).setHeader("Content-Disposition", `attachment; filename="Ranking-vendas-${ano}-${String(mes).padStart(2, "0")}.xlsx"`);
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
