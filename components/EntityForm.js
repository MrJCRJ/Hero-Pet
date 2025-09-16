// components/EntityForm.js

import React from "react";
import { Button } from "./ui/Button";
import { FormContainer } from "./ui/Form";
import { EntityTypeSelector } from "./entity/EntityTypeSelector";
import { DocumentSection } from "./entity/DocumentSection";
import { AddressSection } from "./entity/AddressSection";
import { ContactSection } from "./entity/ContactSection";
import { StatusToggle } from "./entity/StatusToggle";
import {
  isDocumentCnpj,
  formatCpfCnpj,
  formatCep,
  formatTelefone,
  stripDigits,
  classifyDocument,
} from "./entity/utils";

export function EntityForm({ form, setForm }) {
  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;

    // Radio buttons para tipo de entidade
    if (inputType === 'radio' && name === 'entityType') {
      setForm(prev => ({ ...prev, entityType: value }));
      return;
    }

    // Checkbox para documento pendente
    if (inputType === "checkbox" && name === "documento_pendente") {
      setForm((prev) => ({
        ...prev,
        documento_pendente: checked,
        documento: checked ? "" : prev.documento,
        document_status: checked ? "pending" : prev.document_status,
      }));
      return;
    }

    // Outros checkboxes
    if (inputType === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    // Campos que precisam normalização de dígitos
    if (['documento', 'cep', 'telefone'].includes(name)) {
      const limits = { documento: 14, cep: 8, telefone: 11 };
      const digits = stripDigits(value).slice(0, limits[name]);
      setForm((prev) => ({ ...prev, [name]: digits }));
      return;
    }

    // Nome sempre em maiúsculo
    if (name === "nome") {
      setForm((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    // Outros campos textuais (complemento, numero, email)
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlurDocumento = (e) => {
    const digits = stripDigits(e.target.value);
    if (!form.documento_pendente) {
      const { status } = classifyDocument(digits);
      setForm((prev) => ({ ...prev, document_status: status }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(
      `${form.entityType === "client" ? "Cliente" : "Fornecedor"} cadastrado!\n` +
      JSON.stringify(form, null, 2),
    );
  };

  // Computed values
  const isClient = form.entityType === "client";
  const documentIsCnpj = isDocumentCnpj(form.documento);

  return (
    <FormContainer
      title={`Formulário de ${isClient ? "Cliente" : "Fornecedor"}`}
      onSubmit={handleSubmit}
    >
      <div >
        {/* Seção Tipo e Documento */}
        <div className="card p-6 space-y-2">
          <EntityTypeSelector value={form.entityType} onChange={handleChange} />
          <DocumentSection
            form={{
              ...form,
              documento: formatCpfCnpj(form.documento),
            }}
            isDocumentCnpj={documentIsCnpj}
            onChange={handleChange}
            onBlurDocumento={handleBlurDocumento}
          />
        </div>

        {/* Seções Endereço e Contato em Grid Responsivo */}
        <div className="grid gap-2 lg:grid-cols-2">
          <div className="card p-1 space-y-2">
            <AddressSection
              form={{
                ...form,
                cep: formatCep(form.cep),
              }}
              onChange={handleChange}
            />
          </div>

          <div className="card p-1 space-y-2">
            <ContactSection
              form={{
                ...form,
                telefone: formatTelefone(form.telefone),
              }}
              onChange={handleChange}
            />

          </div>
          <div className="card p-1 space-y-2">
            <StatusToggle checked={form.ativo} onChange={handleChange} />
          </div>
        </div>

        {/* Botão de Ação */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth={false}
            className="min-w-[120px]"
          >
            Salvar
          </Button>
        </div>
      </div>
    </FormContainer>
  );
}
