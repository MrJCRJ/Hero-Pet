import { describe, expect, it } from "vitest";
import { computeNewAverageCost } from "@/lib/stock/simplified";

describe("computeNewAverageCost", () => {
  it("usa custo de entrada quando estoque atual e zero", () => {
    const result = computeNewAverageCost({
      estoqueAtualKg: 0,
      custoMedioAtualKg: 0,
      quantidadeEntradaKg: 10,
      custoEntradaKg: 12.5,
    });
    expect(result).toBe(12.5);
  });

  it("calcula media ponderada com estoque existente", () => {
    const result = computeNewAverageCost({
      estoqueAtualKg: 10,
      custoMedioAtualKg: 10,
      quantidadeEntradaKg: 10,
      custoEntradaKg: 20,
    });
    expect(result).toBe(15);
  });

  it("nao altera custo com entrada invalida", () => {
    const result = computeNewAverageCost({
      estoqueAtualKg: 8,
      custoMedioAtualKg: 11,
      quantidadeEntradaKg: 0,
      custoEntradaKg: 20,
    });
    expect(result).toBe(11);
  });
});

