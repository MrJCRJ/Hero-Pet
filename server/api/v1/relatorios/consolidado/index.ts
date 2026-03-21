import { fetchDadosConsolidado, payloadParaAlertas } from "@/lib/relatorios/fetchDadosConsolidado";
import { computeAlertas } from "@/lib/relatorios/computeAlertas";
import { gerarConsolidadoPDF } from "@/lib/relatorios/exportPDF";
import { gerarConsolidadoExcel } from "@/lib/relatorios/exportExcel";
import { periodoFilename } from "@/lib/relatorios/dateBounds";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

type ResWithHeaders = ApiResLike & { setHeader: (name: string, value: string) => void; end: (chunk?: unknown) => void };

export default async function consolidadoHandler(
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
    const format = (req.query?.format as string) || "json";

    const payload = await fetchDadosConsolidado(mes, ano);
    const dadosParaAlertas = payloadParaAlertas(payload);
    const alertas = computeAlertas(dadosParaAlertas);

    const resposta = { ...payload, alertas };

    if (format === "pdf") {
      gerarConsolidadoPDF(resposta, res as ResWithHeaders);
      return;
    }
    if (format === "xlsx") {
      const buffer = await gerarConsolidadoExcel(resposta);
      (res as ResWithHeaders).setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      (res as ResWithHeaders).setHeader("Content-Disposition", `attachment; filename="Relatorio-Consolidado-${periodoFilename(mes, ano)}.xlsx"`);
      (res as ResWithHeaders).status(200);
      (res as ResWithHeaders).end(buffer);
      return;
    }

    res.status(200).json(resposta);
  } catch (e) {
    console.error("GET /relatorios/consolidado error", e);
    res.status(500).json({ error: "Erro ao gerar relatório consolidado" });
  }
}
