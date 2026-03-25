import { describe, expect, test } from "vitest";
import { parseRelatorioQuery } from "@/lib/relatorios/parseRelatoriosQuery";

describe("parseRelatorioQuery", () => {
  test("aplica defaults para mes/ano quando query vazia", () => {
    const parsed = parseRelatorioQuery({}, { defaultMes: 3, defaultAno: 2025 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.mes).toBe(3);
    expect(parsed.data.ano).toBe(2025);
    expect(parsed.data.format).toBe("json");
  });

  test("retorna erro para valores numéricos inválidos", () => {
    const parsed = parseRelatorioQuery({ mes: "abc" });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain("numéricos inválidos");
  });

  test("valida ranges de período", () => {
    const parsed = parseRelatorioQuery({ mes: "13", ano: "2025" });
    expect(parsed.ok).toBe(false);
  });

  test("permite compare somente quando habilitado", () => {
    const blocked = parseRelatorioQuery({ compare: "1" });
    expect(blocked.ok).toBe(false);
    const allowed = parseRelatorioQuery({ compare: "ano_anterior" }, { allowCompare: true });
    expect(allowed.ok).toBe(true);
  });
});
