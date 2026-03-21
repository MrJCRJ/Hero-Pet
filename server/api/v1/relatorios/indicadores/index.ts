import { getReportBounds } from "@/lib/relatorios/dateBounds";
import { computeIndicadores } from "@/lib/relatorios/computeIndicadores";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function indicadoresHandler(
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
    const { firstDay, lastDay } = getReportBounds(mes, ano);

    const firstDate = new Date(firstDay);
    const lastDate = new Date(lastDay);
    const diasPeriodo = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000)));

    const indicadores = await computeIndicadores(firstDay, lastDay);

    res.status(200).json({
      periodo: { mes, ano, firstDay, lastDay, diasPeriodo },
      indicadores: {
        pmr: { valor: indicadores.pmr, label: "Prazo médio de recebimento (dias)", unidade: "dias" },
        pmp: { valor: indicadores.pmp, label: "Prazo médio de pagamento (dias)", unidade: "dias" },
        giroEstoque: { valor: indicadores.giroEstoque, label: "Giro de estoque", unidade: "vezes/ano" },
        dve: { valor: indicadores.dve, label: "Dias de venda em estoque", unidade: "dias" },
      },
    });
  } catch (e) {
    console.error("GET /relatorios/indicadores error", e);
    res.status(500).json({ error: "Erro ao calcular indicadores" });
  }
}
