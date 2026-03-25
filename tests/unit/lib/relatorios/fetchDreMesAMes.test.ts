import { somarDreMeses } from "@/lib/relatorios/fetchDreMesAMes";

describe("somarDreMeses", () => {
  test("soma meses e recalcula margens sobre totais", () => {
    const tot = somarDreMeses([
      {
        mes: "2026-01",
        periodo_inicio: "2026-01-01",
        periodo_fim_exclusivo: "2026-02-01",
        receitas: 1000,
        custos_vendas: 600,
        despesas: 100,
        lucro_bruto: 400,
        lucro_operacional: 300,
        margem_bruta_pct: 40,
        margem_operacional_pct: 30,
      },
      {
        mes: "2026-02",
        periodo_inicio: "2026-02-01",
        periodo_fim_exclusivo: "2026-03-01",
        receitas: 500,
        custos_vendas: 300,
        despesas: 50,
        lucro_bruto: 200,
        lucro_operacional: 150,
        margem_bruta_pct: 40,
        margem_operacional_pct: 30,
      },
    ]);
    expect(tot.receitas).toBe(1500);
    expect(tot.custos_vendas).toBe(900);
    expect(tot.despesas).toBe(150);
    expect(tot.lucro_bruto).toBe(600);
    expect(tot.lucro_operacional).toBe(450);
    expect(tot.margem_bruta_pct).toBe(40);
    expect(tot.margem_operacional_pct).toBe(30);
  });

  test("lista vazia retorna zeros com rótulo TOTAL", () => {
    const tot = somarDreMeses([]);
    expect(tot.mes).toBe("TOTAL");
    expect(tot.receitas).toBe(0);
    expect(tot.lucro_operacional).toBe(0);
  });
});
