import type { IndicadoresComDetalhe } from "@/lib/relatorios/computeIndicadores";
import {
  computeIndicadoresDerivadosBi,
  type IndicadoresDerivadosBi,
} from "@/lib/relatorios/computeIndicadoresDerivadosBi";

export interface IndicadoresConsolidados {
  indicadores: {
    pmr: number | null;
    pmp: number | null;
    giroEstoque: number | null;
    dve: number | null;
  };
  indicadoresDerivadosBi: IndicadoresDerivadosBi;
}

export function buildIndicadoresConsolidados(
  indicadoresFull: IndicadoresComDetalhe
): IndicadoresConsolidados {
  return {
    indicadores: {
      pmr: indicadoresFull.pmr,
      pmp: indicadoresFull.pmp,
      giroEstoque: indicadoresFull.giroEstoque,
      dve: indicadoresFull.dve,
    },
    indicadoresDerivadosBi: computeIndicadoresDerivadosBi({
      vendasPeriodo: indicadoresFull.vendasPeriodo,
      comprasPeriodo: indicadoresFull.comprasPeriodo,
      pmr: indicadoresFull.pmr,
      pmp: indicadoresFull.pmp,
      dve: indicadoresFull.dve,
      mediaContasReceber: indicadoresFull.mediaContasReceber,
    }),
  };
}
