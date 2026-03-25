import { fetchDadosConsolidado } from "@/lib/relatorios/fetchDadosConsolidado";
import { parseRelatorioQuery } from "@/lib/relatorios/parseRelatoriosQuery";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function fluxoCaixaHandler(
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
      allowCompare: true,
    });
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
    const fluxo = consolidado.fluxo;
    const cenario = consolidado.cenarioLiquidacao;
    const valorPresumidoVendaEstoque =
      cenario && !cenario.erro ? cenario.valorPresumidoVendaBruto : 0;
    const payload = {
      periodo: consolidado.periodo,
      fluxo: {
        saldoInicial: fluxo.saldoInicial,
        saldoFinal: fluxo.saldoFinal,
        entradas: fluxo.entradas,
        saidas: fluxo.saidas,
        saldo: fluxo.saldo,
        fluxoOperacional: fluxo.fluxoOperacional,
        fluxoFinanciamento: fluxo.entradas.aportesCapital,
        fluxoInvestimento: 0,
        valorEstoque: 0,
        valorPresumidoVendaEstoque,
        evolucaoMensal: fluxo.evolucaoMensal,
        conciliacao: fluxo.conciliacao ?? {},
      },
    };

    res.status(200).json(payload);
  } catch (e) {
    console.error("GET /relatorios/fluxo-caixa error", e);
    res.status(500).json({ error: "Erro ao gerar fluxo de caixa" });
  }
}
