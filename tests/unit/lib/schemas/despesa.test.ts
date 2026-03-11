import { describe, it, expect } from "vitest";
import { parseDespesaBody } from "@/lib/schemas/despesa";

describe("lib/schemas/despesa", () => {
  describe("parseDespesaBody", () => {
    it("aceita body válido", () => {
      const body = {
        descricao: "Compra material",
        categoria: "Compras",
        valor: 100.5,
        data_vencimento: "2025-03-15",
      };
      const result = parseDespesaBody(body);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.descricao).toBe("Compra material");
        expect(result.data.categoria).toBe("Compras");
        expect(result.data.valor).toBe(100.5);
        expect(result.data.data_vencimento).toBe("2025-03-15");
        expect(result.data.status).toBe("pendente");
      }
    });

    it("rejeita descricao vazia", () => {
      const result = parseDespesaBody({
        descricao: "",
        categoria: "Compras",
        valor: 10,
        data_vencimento: "2025-03-15",
      });
      expect(result.success).toBe(false);
    });

    it("rejeita valor inválido", () => {
      const result = parseDespesaBody({
        descricao: "Teste",
        categoria: "Compras",
        valor: -5,
        data_vencimento: "2025-03-15",
      });
      expect(result.success).toBe(false);
    });

    it("aceita valor como string", () => {
      const result = parseDespesaBody({
        descricao: "Teste",
        categoria: "Compras",
        valor: "99.99",
        data_vencimento: "2025-03-15",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valor).toBe(99.99);
      }
    });
  });
});
