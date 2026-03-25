import { enrichSerieComMediasMoveis } from "@/lib/relatorios/enrichSerieDreMensal";
import type { DreMesRow } from "@/lib/relatorios/fetchDreMesAMes";

describe("enrichSerieComMediasMoveis", () => {
  it("calcula médias móveis 3 a partir do terceiro mês", () => {
    const meses: DreMesRow[] = [
      {
        mes: "2024-01",
        periodo_inicio: "2024-01-01",
        periodo_fim_exclusivo: "2024-02-01",
        receitas: 100,
        custos_vendas: 0,
        despesas: 0,
        lucro_bruto: 100,
        lucro_operacional: 100,
        margem_bruta_pct: 100,
        margem_operacional_pct: 100,
      },
      {
        mes: "2024-02",
        periodo_inicio: "2024-02-01",
        periodo_fim_exclusivo: "2024-03-01",
        receitas: 200,
        custos_vendas: 0,
        despesas: 0,
        lucro_bruto: 200,
        lucro_operacional: 200,
        margem_bruta_pct: 100,
        margem_operacional_pct: 100,
      },
      {
        mes: "2024-03",
        periodo_inicio: "2024-03-01",
        periodo_fim_exclusivo: "2024-04-01",
        receitas: 300,
        custos_vendas: 0,
        despesas: 0,
        lucro_bruto: 300,
        lucro_operacional: 300,
        margem_bruta_pct: 100,
        margem_operacional_pct: 100,
      },
    ];
    const out = enrichSerieComMediasMoveis(meses);
    expect(out[0].receita_media_movel_3).toBeNull();
    expect(out[1].receita_media_movel_3).toBeNull();
    expect(out[2].receita_media_movel_3).toBe(200);
  });
});
