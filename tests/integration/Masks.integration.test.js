import {
  formatCpfCnpj,
  formatCep,
  formatTelefone,
} from "components/entities/shared/masks";

describe("Máscaras Utilitárias (integração leve)", () => {
  test("CPF", () => {
    expect(formatCpfCnpj("12345678901")).toBe("123.456.789-01");
  });
  test("CNPJ", () => {
    expect(formatCpfCnpj("12345678000190")).toBe("12.345.678/0001-90");
  });
  test("CEP", () => {
    expect(formatCep("12345678")).toBe("12345-678");
  });
  test("Telefone fixo", () => {
    expect(formatTelefone("1132654321")).toBe("(11) 3265-4321");
  });
  test("Telefone celular", () => {
    expect(formatTelefone("11987654321")).toBe("(11) 98765-4321");
  });
});
