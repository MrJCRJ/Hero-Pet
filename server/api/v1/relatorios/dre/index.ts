import { fetchDadosConsolidado } from "@/lib/relatorios/fetchDadosConsolidado";
import { parseRelatorioQuery } from "@/lib/relatorios/parseRelatoriosQuery";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function dreHandler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const parsed = parseRelatorioQuery(req.query, { allowFormat: true });
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { mes, ano, format } = parsed.data;
    if (format === "pdf" || format === "xlsx") {
      if (res.setHeader) res.setHeader("Deprecation", "true");
      res.status(400).json({ erro: "Use o relatório consolidado em JSON" });
      return;
    }

    const consolidado = await fetchDadosConsolidado(mes, ano);
    const receitas = consolidado.dre.receitas;
    const custosVendas = consolidado.dre.custosVendas;
    const despesas = consolidado.dre.despesas;
    const ebitda = consolidado.dre.ebitda;
    const margemEbitda = receitas > 0 ? Number(((ebitda / receitas) * 100).toFixed(2)) : 0;
    const despesasSobreReceita = receitas > 0 ? Number(((despesas / receitas) * 100).toFixed(2)) : 0;
    const custosSobreReceita = receitas > 0 ? Number(((custosVendas / receitas) * 100).toFixed(2)) : 0;

    const dreAnterior = consolidado.dreAnterior
      ? {
          receitas: consolidado.dreAnterior.receitas,
          custosVendas: 0,
          lucroBruto: Number(
            (
              consolidado.dreAnterior.receitas *
              (consolidado.dreAnterior.margemBruta / 100)
            ).toFixed(2)
          ),
          despesas: 0,
          impostos: 0,
          lucroOperacional: consolidado.dreAnterior.lucroOperacional,
          margemBruta: consolidado.dreAnterior.margemBruta,
          margemOperacional:
            consolidado.dreAnterior.receitas > 0
              ? Number(
                  (
                    (consolidado.dreAnterior.lucroOperacional /
                      consolidado.dreAnterior.receitas) *
                    100
                  ).toFixed(2)
                )
              : 0,
        }
      : null;

    const payload = {
      periodo: consolidado.periodo,
      dre: {
        receitas,
        receitaBruta: consolidado.dre.receitaBruta,
        receitaLiquida: consolidado.dre.receitaLiquida,
        custosVendas,
        lucroBruto: consolidado.dre.lucroBruto,
        despesas,
        impostos: consolidado.dre.impostos,
        lucroOperacional: consolidado.dre.lucroOperacional,
        ebitda,
        margemBruta: consolidado.dre.margemBruta,
        margemOperacional: consolidado.dre.margemOperacional,
        margemEbitda,
        despesasSobreReceita,
        custosSobreReceita,
      },
      ...(dreAnterior ? { dreAnterior } : {}),
    };

    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /relatorios/dre error", e);
    res.status(500).json({ error: "Erro ao gerar DRE" });
  }
}
