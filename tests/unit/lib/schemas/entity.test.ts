import { describe, it, expect } from "vitest";
import { parseEntityBody } from "@/lib/schemas/entity";

describe("entitySchema", () => {
  it("valida entity com nome e entity_type PF", () => {
    const result = parseEntityBody({
      name: "João Silva",
      entity_type: "PF",
      document_digits: "529.982.247-25",
      document_pending: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("JOÃO SILVA");
      expect(result.data.entity_type).toBe("PF");
      expect(result.data.document_digits).toBe("52998224725");
    }
  });

  it("valida entity com entity_type PJ", () => {
    const result = parseEntityBody({
      name: "ACME LTDA",
      entity_type: "PJ",
      document_digits: "11.444.777/0001-61",
      document_pending: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entity_type).toBe("PJ");
    }
  });

  it("rejeita nome vazio", () => {
    const result = parseEntityBody({
      name: "",
      entity_type: "PF",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita entity_type inválido", () => {
    const result = parseEntityBody({
      name: "Test",
      entity_type: "XX",
    });
    expect(result.success).toBe(false);
  });

  it("aceita document_pending sem documento válido", () => {
    const result = parseEntityBody({
      name: "Cliente Pendente",
      entity_type: "PF",
      document_pending: true,
      document_digits: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita documento com tamanho inválido (ex: 10 dígitos)", () => {
    const result = parseEntityBody({
      name: "Test",
      entity_type: "PF",
      document_digits: "1234567890",
      document_pending: false,
    });
    expect(result.success).toBe(false);
  });
});
