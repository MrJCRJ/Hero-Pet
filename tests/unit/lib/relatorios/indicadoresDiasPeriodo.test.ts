/**
 * Garante que o cálculo de dias do período usado nos indicadores
 * coincide com getReportBounds (mesmo critério que DRE / ranking).
 */
import { getReportBounds } from "@/lib/relatorios/dateBounds";

function diasPeriodoRelatorio(firstDay: string, lastDay: string): number {
  const firstDate = new Date(firstDay);
  const lastDate = new Date(lastDay);
  return Math.max(
    1,
    Math.round((lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000))
  );
}

describe("diasPeriodo alinhado a getReportBounds", () => {
  test("março/2025: ~31 dias", () => {
    const { firstDay, lastDay } = getReportBounds(3, 2025);
    expect(diasPeriodoRelatorio(firstDay, lastDay)).toBe(31);
  });

  test("ano cheio 2025: 365 dias", () => {
    const { firstDay, lastDay } = getReportBounds(0, 2025);
    expect(diasPeriodoRelatorio(firstDay, lastDay)).toBe(365);
  });

  test("últimos 12 meses (ano=0): janela ~365 dias", () => {
    const { firstDay, lastDay } = getReportBounds(1, 0);
    const d = diasPeriodoRelatorio(firstDay, lastDay);
    expect(d).toBeGreaterThanOrEqual(360);
    expect(d).toBeLessThanOrEqual(370);
  });
});
