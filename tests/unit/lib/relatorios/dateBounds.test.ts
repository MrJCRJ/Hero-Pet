import {
  getReportBounds,
  periodoFilename,
} from "@/lib/relatorios/dateBounds";

describe("getReportBounds", () => {
  test("mês específico: intervalo [firstDay, lastDay) com lastDay exclusivo", () => {
    const { firstDay, lastDay, isFullYear, isAllTime } = getReportBounds(3, 2025);
    expect(firstDay).toBe("2025-03-01");
    expect(lastDay).toBe("2025-04-01");
    expect(isFullYear).toBe(false);
    expect(isAllTime).toBe(false);
  });

  test("dezembro: virada de ano no lastDay", () => {
    const { firstDay, lastDay } = getReportBounds(12, 2024);
    expect(firstDay).toBe("2024-12-01");
    expect(lastDay).toBe("2025-01-01");
  });

  test("mes=0: ano civil inteiro", () => {
    const { firstDay, lastDay, isFullYear } = getReportBounds(0, 2025);
    expect(firstDay).toBe("2025-01-01");
    expect(lastDay).toBe("2026-01-01");
    expect(isFullYear).toBe(true);
  });

  test("ano=0: últimos 12 meses (janela rolante)", () => {
    const { firstDay, lastDay, isFullYear, isAllTime } = getReportBounds(1, 0);
    expect(isFullYear).toBe(false);
    expect(isAllTime).toBe(false);
    expect(firstDay < lastDay).toBe(true);
    expect(firstDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(lastDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("periodoFilename", () => {
  test("ano 0 retorna todos", () => {
    expect(periodoFilename(1, 0)).toBe("todos");
  });

  test("mês 0 e ano > 0 retorna só o ano", () => {
    expect(periodoFilename(0, 2025)).toBe("2025");
  });

  test("mês e ano preenchidos", () => {
    expect(periodoFilename(4, 2025)).toBe("2025-04");
  });
});
