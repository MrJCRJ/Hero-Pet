import { fetchDadosConsolidado } from "@/lib/relatorios/fetchDadosConsolidado";
import { parseRelatorioQuery } from "@/lib/relatorios/parseRelatoriosQuery";
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
    const parsed = parseRelatorioQuery(req.query);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { mes, ano } = parsed.data;
    const consolidado = await fetchDadosConsolidado(mes, ano);
    const { firstDay, lastDay } = consolidado.periodo;

    const firstDate = new Date(firstDay);
    const lastDate = new Date(lastDay);
    const diasPeriodo = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000)));
    const indicadores = consolidado.indicadores;

    res.status(200).json({
      periodo: { ...consolidado.periodo, diasPeriodo },
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
