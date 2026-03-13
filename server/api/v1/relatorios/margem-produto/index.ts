import database from "infra/database.js";
import { gerarMargemPDF } from "@/lib/relatorios/exportPDF";
import { gerarMargemExcel } from "@/lib/relatorios/exportExcel";
import { getReportBounds, periodoFilename } from "@/lib/relatorios/dateBounds";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

type ResWithHeaders = ApiResLike & { setHeader: (name: string, value: string) => void; end: (chunk?: unknown) => void };

export default async function margemProdutoHandler(
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
    const limit = Math.min(50, Math.max(5, Number(req.query?.limit) || 20));
    const { firstDay, lastDay } = getReportBounds(mes, ano);

    const result = await database.query({
      text: `SELECT
               i.produto_id,
               p.nome,
               p.categoria,
               COALESCE(SUM(i.total_item),0)::numeric(14,2) AS receita,
               COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs,
               (COALESCE(SUM(i.total_item),0) - COALESCE(SUM(i.custo_total_item),0))::numeric(14,2) AS lucro,
               COALESCE(SUM(i.quantidade),0)::numeric(14,3) AS quantidade
             FROM pedido_itens i
             JOIN pedidos pdr ON pdr.id = i.pedido_id
             JOIN produtos p ON p.id = i.produto_id
             WHERE pdr.tipo = 'VENDA' AND pdr.status = 'confirmado'
               AND pdr.data_emissao >= $1 AND pdr.data_emissao < $2
             GROUP BY i.produto_id, p.nome, p.categoria
             HAVING COALESCE(SUM(i.total_item),0) > 0
             ORDER BY lucro DESC, receita DESC
             LIMIT $3`,
      values: [firstDay, lastDay, limit],
    });

    const itens = (result.rows as Array<Record<string, unknown>>).map((r) => {
      const receita = Number(r.receita || 0);
      const cogs = Number(r.cogs || 0);
      const lucro = Number(r.lucro || 0);
      const margem = receita > 0 ? Number(((lucro / receita) * 100).toFixed(2)) : 0;
      return {
        produto_id: r.produto_id,
        nome: r.nome,
        categoria: r.categoria || null,
        receita,
        cogs,
        lucro,
        margem,
        quantidade: Number(r.quantidade || 0),
      };
    });

    const format = (req.query?.format as string) || "json";
    const payload = { periodo: { mes, ano, firstDay, lastDay }, itens };

    if (format === "pdf") {
      gerarMargemPDF(payload, res as ResWithHeaders);
      return;
    }
    if (format === "xlsx") {
      const buffer = await gerarMargemExcel(payload);
      (res as ResWithHeaders).setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      (res as ResWithHeaders).setHeader("Content-Disposition", `attachment; filename="Margem-Produto-${periodoFilename(mes, ano)}.xlsx"`);
      (res as ResWithHeaders).status(200);
      (res as ResWithHeaders).end(buffer);
      return;
    }

    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /relatorios/margem-produto error", e);
    res.status(500).json({ error: "Erro ao gerar margem por produto" });
  }
}
