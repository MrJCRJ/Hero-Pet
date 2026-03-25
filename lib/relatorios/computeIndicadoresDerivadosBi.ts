/**
 * Indicadores derivados para BI / IA (ciclo de conversão de caixa, giro de CR).
 * Usa os mesmos inputs que computeIndicadores (PMR, PMP, DVE) + receitas do período.
 */

export interface IndicadoresDerivadosBi {
  /** DVE + PMR - PMP (dias). Null se algum componente essencial for null. */
  ciclo_conversao_caixa_dias: number | null;
  /** Vendas / média de contas a receber no período (vezes). */
  giro_contas_receber: number | null;
  formulas: {
    ciclo_conversao: string;
    giro_cr: string;
  };
}

export function computeIndicadoresDerivadosBi(input: {
  vendasPeriodo: number;
  pmr: number | null;
  pmp: number | null;
  dve: number | null;
  /** (CR inicial + CR final) / 2 — igual ao usado em PMR */
  mediaContasReceber: number;
}): IndicadoresDerivadosBi {
  const { vendasPeriodo, pmr, pmp, dve, mediaContasReceber } = input;

  let ciclo: number | null = null;
  if (dve != null && pmr != null && pmp != null) {
    ciclo = Number((dve + pmr - pmp).toFixed(1));
  }

  let giroCr: number | null = null;
  if (mediaContasReceber > 0 && vendasPeriodo > 0) {
    giroCr = Number((vendasPeriodo / mediaContasReceber).toFixed(2));
  }

  return {
    ciclo_conversao_caixa_dias: ciclo,
    giro_contas_receber: giroCr,
    formulas: {
      ciclo_conversao: "DVE + PMR - PMP (dias)",
      giro_cr: "vendas_periodo / media_contas_receber",
    },
  };
}
