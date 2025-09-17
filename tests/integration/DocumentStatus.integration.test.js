import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EntityTypeSelector,
  DocumentSection,
  applyChange,
  applyDocumentBlur,
  computeDerived,
} from "components/entities";

function Wrapper({ initial }) {
  const [form, setForm] = useState({
    entityType: "client",
    nome: "",
    documento: "",
    documento_pendente: false,
    document_status: "pending",
    cep: "",
    numero: "",
    complemento: "",
    email: "",
    telefone: "",
    ativo: true,
    ...initial,
  });
  const derived = computeDerived(form);
  return (
    <div>
      <EntityTypeSelector
        value={form.entityType}
        onChange={(e) => setForm((p) => applyChange(p, e.target))}
      />
      <DocumentSection
        form={derived.formatted}
        isDocumentCnpj={derived.documentIsCnpj}
        onChange={(e) => setForm((p) => applyChange(p, e.target))}
        onBlurDocumento={() => setForm((p) => applyDocumentBlur(p))}
      />
    </div>
  );
}

function setup(initial) {
  const user = userEvent.setup();
  render(<Wrapper initial={initial} />);
  return { user };
}

describe("Status do Documento - Integração", () => {
  test("marca pendente desabilita campo e badge mostra PENDENTE", async () => {
    const { user } = setup();
    const checkbox = screen.getByLabelText(/Documento ainda não disponível/i);
    const inputDoc = screen.getByLabelText(/CPF|CNPJ/i);
    await user.click(checkbox);
    expect(inputDoc).toBeDisabled();
    expect(screen.getByText("PENDENTE")).toBeInTheDocument();
  });

  test("CPF inválido vira PROVISÓRIO após blur", async () => {
    const { user } = setup();
    const inputDoc = screen.getByLabelText(/CPF|CNPJ/i);
    await user.type(inputDoc, "11111111111"); // inválido (repetido)
    // Usa tab para disparar blur dentro de act
    await user.tab();
    expect(await screen.findByText("PROVISÓRIO")).toBeInTheDocument();
  });

  test("CPF válido mostra VALIDADO", async () => {
    const { user } = setup();
    const inputDoc = screen.getByLabelText(/CPF|CNPJ/i);
    // CPF válido de exemplo: 52998224725
    await user.type(inputDoc, "52998224725");
    await user.tab();
    expect(await screen.findByText("VALIDADO")).toBeInTheDocument();
  });

  test("CNPJ parcial fica PROVISÓRIO", async () => {
    const { user } = setup();
    const inputDoc = screen.getByLabelText(/CPF|CNPJ/i);
    await user.type(inputDoc, "123456789012"); // 12 dígitos (ainda parcial para CNPJ)
    await user.tab();
    expect(await screen.findByText("PROVISÓRIO")).toBeInTheDocument();
  });
});
