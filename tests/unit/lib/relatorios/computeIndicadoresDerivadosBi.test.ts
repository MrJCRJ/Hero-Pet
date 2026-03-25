import { computeIndicadoresDerivadosBi } from "@/lib/relatorios/computeIndicadoresDerivadosBi";

describe("computeIndicadoresDerivadosBi", () => {
  it("calcula ciclo de conversão e giro de CR", () => {
    const r = computeIndicadoresDerivadosBi({
      vendasPeriodo: 10000,
      comprasPeriodo: 5000,
      pmr: 30,
      pmp: 20,
      dve: 45,
      mediaContasReceber: 5000,
    });
    expect(r.ciclo_conversao_caixa_dias).toBe(55);
    expect(r.giro_contas_receber).toBe(2);
    expect(r.indicadores_contexto.confianca_baixa_ciclo).toBe(false);
  });

  it("retorna null no ciclo se faltar componente", () => {
    const r = computeIndicadoresDerivadosBi({
      vendasPeriodo: 10000,
      comprasPeriodo: 5000,
      pmr: null,
      pmp: 20,
      dve: 45,
      mediaContasReceber: 5000,
    });
    expect(r.ciclo_conversao_caixa_dias).toBeNull();
    expect(r.indicadores_contexto.confianca_baixa_ciclo).toBe(true);
  });

  it("ciclo negativo vira null com PMP esparso", () => {
    // ciclo_raw = dve + pmr - pmp = 10 + 10 - 50 = -30
    const r = computeIndicadoresDerivadosBi({
      vendasPeriodo: 10000,
      comprasPeriodo: 400, // 0.04 => compras base esparsa
      pmr: 10,
      pmp: 50,
      dve: 10,
      mediaContasReceber: 5000,
    });
    expect(r.ciclo_conversao_caixa_dias).toBeNull();
    expect(r.indicadores_contexto.confianca_baixa_ciclo).toBe(true);
    expect(r.indicadores_contexto.notas_confianca_baixa_ciclo.length).toBeGreaterThan(0);
  });
});
