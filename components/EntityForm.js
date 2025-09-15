import React from "react";
import { Button } from "./ui/Button";
import { FormContainer } from "./ui/Form";
import { EntityTypeSelector } from "./entity/EntityTypeSelector";
import { DocumentSection } from "./entity/DocumentSection";
import { AddressSection } from "./entity/AddressSection";
import { ContactSection } from "./entity/ContactSection";
import { StatusToggle } from "./entity/StatusToggle";
import { isDocumentCnpj, formatCpfCnpj, formatCep, formatTelefone, stripDigits, classifyDocument } from "./entity/utils";

export function EntityForm({ form, setForm }) {
  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;

    if (inputType === "checkbox") {
      if (name === "documento_pendente") {
        // Ao marcar pendente limpamos documento e status volta a pending
        setForm((prev) => ({
          ...prev,
          documento_pendente: checked,
          documento: checked ? "" : prev.documento,
          document_status: checked ? "pending" : prev.document_status,
        }));
        return;
      }
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    // Normalização por campo
    let digits = stripDigits(value);
    switch (name) {
      case "documento":
        digits = digits.slice(0, 14); // até CNPJ
        break;
      case "cep":
        digits = digits.slice(0, 8);
        break;
      case "telefone":
        digits = digits.slice(0, 11);
        break;
      default:
        // outros campos ficam como estão (sem filtrar letras etc.)
        break;
    }

    // Campos textuais específicos
    if (name === "nome") {
      // Nome / Razão Social sempre em caixa alta
      setForm((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    if (name === "complemento" || name === "numero" || name === "email") {
      setForm((prev) => ({ ...prev, [name]: value }));
      return;
    }

    if (name === "documento") {
      setForm((prev) => ({ ...prev, [name]: digits }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: digits }));
  };

  const handleBlurDocumento = (e) => {
    const digits = stripDigits(e.target.value);
    if (form.documento_pendente) {
      // se pendente ignoramos validação
      return;
    }
    const { status } = classifyDocument(digits);
    setForm((prev) => ({ ...prev, document_status: status }));
  };

  // Detecta se é CPF ou CNPJ baseado no número de caracteres usando helper
  const documentIsCnpj = isDocumentCnpj(form.documento);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aqui você pode adicionar a lógica de envio para o backend
    alert(
      `${form.entityType === "client" ? "Cliente" : "Fornecedor"} cadastrado!\n` +
      JSON.stringify(form, null, 2),
    );
  };

  const isClient = form.entityType === "client";

  return (
    <FormContainer
      title={`Formulário de ${isClient ? "Cliente" : "Fornecedor"}`}
      onSubmit={handleSubmit}
    >
      <div className="space-y-8">
        {/* Tipo de Entidade */}
        <EntityTypeSelector value={form.entityType} onChange={handleChange} />

        {/* Dados Principais */}
        <DocumentSection
          form={{
            ...form,
            documento: formatCpfCnpj(form.documento),
          }}
          isDocumentCnpj={documentIsCnpj}
          onChange={handleChange}
          onBlurDocumento={handleBlurDocumento}
        />

        {/* Endereço */}
        <AddressSection
          form={{
            ...form,
            cep: formatCep(form.cep),
          }}
          onChange={handleChange}
        />

        {/* Contato */}
        <ContactSection
          form={{
            ...form,
            telefone: formatTelefone(form.telefone),
          }}
          onChange={handleChange}
        />

        {/* Status */}
        <StatusToggle checked={form.ativo} onChange={handleChange} />
      </div>

      <div className="flex justify-end mt-8">
        <Button type="submit" variant="primary" size="sm" fullWidth={false}>
          Enviar
        </Button>
      </div>
    </FormContainer>
  );
}
