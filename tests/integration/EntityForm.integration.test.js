import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntityForm } from "components/EntityForm";

function Wrapper({ initial }) {
  const [form, setForm] = useState({
    entityType: "client",
    nome: "",
    documento: "",
    cep: "",
    numero: "",
    complemento: "",
    email: "",
    telefone: "",
    ativo: true,
    ...initial,
  });
  return <EntityForm form={form} setForm={setForm} />;
}

function setup(initial) {
  const user = userEvent.setup();
  render(<Wrapper initial={initial} />);
  return { user };
}

describe("EntityForm - Integração", () => {
  test("deve aplicar máscara de CPF e depois CNPJ ao continuar digitando", async () => {
    const { user } = setup();
    const inputDocumento = screen.getByLabelText(/CPF|CNPJ/i);

    await user.type(inputDocumento, "12345678901"); // 11 dígitos -> CPF completo
    expect(inputDocumento).toHaveValue("123.456.789-01");

    await user.type(inputDocumento, "23"); // adiciona mais 2 dígitos -> começa transição para CNPJ (a lógica atual só alterna quando >11 dígitos ao formatar)
    // Como mantemos apenas dígitos no estado, a máscara agora deve ser de CNPJ parcial
    expect(inputDocumento.value.startsWith("12.345.678/901")).toBe(true);
  });

  test("deve formatar CEP e Telefone", async () => {
    const { user } = setup();
    const inputCep = screen.getByLabelText(/CEP/i);
    const inputTelefone = screen.getByLabelText(/Telefone/i);

    await user.type(inputCep, "12345678");
    expect(inputCep).toHaveValue("12345-678");

    await user.type(inputTelefone, "11987654321");
    expect(inputTelefone).toHaveValue("(11) 98765-4321");
  });

  test("nome deve ficar em caixa alta", async () => {
    const { user } = setup();
    const inputNome = screen.getByLabelText(/Nome|Razão Social/i);
    await user.type(inputNome, "empresa xyz");
    expect(inputNome).toHaveValue("EMPRESA XYZ");
  });
});
