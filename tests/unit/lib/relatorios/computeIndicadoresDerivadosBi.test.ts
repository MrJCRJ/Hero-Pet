import { computeIndicadoresDerivadosBi } from "@/lib/relatorios/computeIndicadoresDerivadosBi";

describe("computeIndicadoresDerivadosBi", () => {
  it("calcula ciclo de conversão e giro de CR", () => {
    const r = computeIndicadoresDerivadosBi({
      vendasPeriodo: 10000,
      pmr: 30,
      pmp: 20,
      dve: 45,
      mediaContasReceber: 5000,
    });
    expect(r.ciclo_conversao_caixa_dias).toBe(55);
    expect(r.giro_contas_receber).toBe(2);
  });

  it("retorna null no ciclo se faltar componente", () => {
    const r = computeIndicadoresDerivadosBi({
      vendasPeriodo: 10000,
      pmr: null,
      pmp: 20,
      dve: 45,
      mediaContasReceber: 5000,
    });
    expect(r.ciclo_conversao_caixa_dias).toBeNull();
  });
});
