/**
 * Indicadores derivados para BI / IA (ciclo de conversão de caixa, giro de CR).
 * Usa os mesmos inputs que computeIndicadores (PMR, PMP, DVE) + receitas do período.
 */

export interface IndicadoresDerivadosBi {
  /** DVE + PMR - PMP (dias). Null se algum componente essencial for null. */
  ciclo_conversao_caixa_dias: number | null;
  /** Vendas / média de contas a receber no período (vezes). */
  giro_contas_receber: number | null;
  indicadores_contexto: {
    confianca_baixa_ciclo: boolean;
    notas_confianca_baixa_ciclo: string[];
    compras_periodo: number;
    vendas_periodo: number;
    pmr: number | null;
    pmp: number | null;
    dve: number | null;
    ciclo_raw: number | null;
  };
  formulas: {
    ciclo_conversao: string;
    giro_cr: string;
  };
}

export function computeIndicadoresDerivadosBi(input: {
  vendasPeriodo: number;
  comprasPeriodo: number;
  pmr: number | null;
  pmp: number | null;
  dve: number | null;
  /** (CR inicial + CR final) / 2 — igual ao usado em PMR */
  mediaContasReceber: number;
}): IndicadoresDerivadosBi {
  const { vendasPeriodo, comprasPeriodo, pmr, pmp, dve, mediaContasReceber } = input;

  let ciclo: number | null = null;
  let cicloRaw: number | null = null;
  if (dve != null && pmr != null && pmp != null) {
    cicloRaw = Number((dve + pmr - pmp).toFixed(1));
    ciclo = cicloRaw;
  }

  // Regra prática: quando o PMP vem de uma base "esparsa" no período, ele pode distorcer o ciclo.
  // - compras / vendas muito baixa
  // - ou PMP muito alto em termos absolutos
  const comprasBaseEsparsa =
    vendasPeriodo > 0 && comprasPeriodo > 0
      ? comprasPeriodo / vendasPeriodo < 0.05
      : false;
  const pmpMuitoAlto = pmp != null ? pmp > 730 : false; // ~2 anos
  const pmpEsparso = comprasBaseEsparsa || pmpMuitoAlto;

  const notas_confianca_baixa_ciclo: string[] = [];
  let confianca_baixa_ciclo = false;

  if (cicloRaw == null) {
    confianca_baixa_ciclo = true;
    notas_confianca_baixa_ciclo.push("Sem dados suficientes (PMR/PMP/DVE) para estimar o ciclo de conversão.");
  } else if (cicloRaw < 0 && pmpEsparso) {
    confianca_baixa_ciclo = true;
    notas_confianca_baixa_ciclo.push(
      "Ciclo de conversão negativo com PMP calculado sobre base esparsa no período. O valor pode estar distorcido."
    );
    // Remove o número para evitar leitura errada pelo operador/IA.
    ciclo = null;
  }

  let giroCr: number | null = null;
  if (mediaContasReceber > 0 && vendasPeriodo > 0) {
    giroCr = Number((vendasPeriodo / mediaContasReceber).toFixed(2));
  }

  return {
    ciclo_conversao_caixa_dias: ciclo,
    giro_contas_receber: giroCr,
    indicadores_contexto: {
      confianca_baixa_ciclo,
      notas_confianca_baixa_ciclo,
      compras_periodo: comprasPeriodo,
      vendas_periodo: vendasPeriodo,
      pmr,
      pmp,
      dve,
      ciclo_raw: cicloRaw,
    },
    formulas: {
      ciclo_conversao: "DVE + PMR - PMP (dias)",
      giro_cr: "vendas_periodo / media_contas_receber",
    },
  };
}
