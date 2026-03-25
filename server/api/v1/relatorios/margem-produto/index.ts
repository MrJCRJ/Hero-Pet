import { fetchDadosConsolidado } from "@/lib/relatorios/fetchDadosConsolidado";
import { parseRelatorioQuery } from "@/lib/relatorios/parseRelatoriosQuery";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function margemProdutoHandler(
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
      allowCompare: true,
      defaultLimit: 50,
    });
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { mes, ano, format, limit } = parsed.data;
    if (format === "pdf" || format === "xlsx") {
      if (res.setHeader) res.setHeader("Deprecation", "true");
      res.status(400).json({ erro: "Use o relatório consolidado em JSON" });
      return;
    }
    const consolidado = await fetchDadosConsolidado(mes, ano);
    const itens = consolidado.margem.itens.slice(0, limit ?? 50);
    const payload = {
      periodo: consolidado.periodo,
      itens,
      totalReceita: Number(
        itens.reduce((acc, item) => acc + Number(item.receita || 0), 0).toFixed(2)
      ),
      ...(consolidado.margemAnterior
        ? {
            margemAnterior: {
              totalReceita: consolidado.margemAnterior.totalReceita,
              lucroTotal: Number(
                (
                  consolidado.margemAnterior.totalReceita *
                  (consolidado.margemAnterior.margemMediaPonderada / 100)
                ).toFixed(2)
              ),
            },
          }
        : {}),
    };

    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /relatorios/margem-produto error", e);
    res.status(500).json({ error: "Erro ao gerar margem por produto" });
  }
}
