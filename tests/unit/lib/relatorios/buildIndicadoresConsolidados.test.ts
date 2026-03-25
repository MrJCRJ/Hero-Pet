import { describe, expect, test } from "vitest";
import { buildIndicadoresConsolidados } from "@/lib/relatorios/buildIndicadoresConsolidados";

describe("buildIndicadoresConsolidados", () => {
  test("gera indicadores base e derivados em um único passo", () => {
    const result = buildIndicadoresConsolidados({
      pmr: 30,
      pmp: 20,
      dve: 15,
      giroEstoque: 4,
      mediaContasReceber: 1000,
      vendasPeriodo: 4000,
      comprasPeriodo: 2000,
    });

    expect(result.indicadores).toMatchObject({
      pmr: 30,
      pmp: 20,
      dve: 15,
      giroEstoque: 4,
    });
    expect(result.indicadoresDerivadosBi.ciclo_conversao_caixa_dias).toBe(25);
    expect(result.indicadoresDerivadosBi.giro_contas_receber).toBe(4);
  });
});
