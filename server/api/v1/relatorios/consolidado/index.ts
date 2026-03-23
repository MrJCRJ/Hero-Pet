import { fetchDadosConsolidado, payloadParaAlertas } from "@/lib/relatorios/fetchDadosConsolidado";
import { computeAlertas } from "@/lib/relatorios/computeAlertas";
import { computeCenarioLiquidacao, getConfigLiquidacao } from "@/lib/relatorios/computeCenarioLiquidacao";
import { buildJsonConsolidado } from "@/lib/relatorios/exportJsonConsolidado";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

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

    const payload = await fetchDadosConsolidado(mes, ano);

    const saldoSociosParam = req.query?.saldoSocios as string | undefined;
    if (saldoSociosParam != null && saldoSociosParam !== "") {
      const saldoOverride = Number(saldoSociosParam);
      if (Number.isFinite(saldoOverride) && saldoOverride >= 0) {
        const config = getConfigLiquidacao();
        payload.cenarioLiquidacao = computeCenarioLiquidacao({
          saldoCaixaAtual: payload.fluxo.saldoFinal,
          valorPresumidoVendaEstoque:
            payload.cenarioLiquidacao?.valorPresumidoVendaBruto ?? 0,
          promissoriasAReceber:
            payload.cenarioLiquidacao?.promissoriasAReceber ?? 0,
          comissaoPct: config.comissaoPct,
          saldoDevolverSocios: saldoOverride,
        });
      }
    }

    const dadosParaAlertas = payloadParaAlertas(payload);
    const alertas = computeAlertas(dadosParaAlertas);
    const resposta = { ...payload, alertas };

    const json = buildJsonConsolidado(resposta);
    const dataGeracao = (json.data_geracao as string) ?? new Date().toISOString();
    const filenameDate = dataGeracao.slice(0, 10).replace(/-/g, "");
    const filename = `relatorio_consolidado_${filenameDate}.json`;

    if (res.setHeader) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }
    res.status(200).json(json);
  } catch (e) {
    console.error("GET /relatorios/consolidado error", e);
    res.status(500).json({ error: "Erro ao gerar relatório consolidado" });
  }
}
