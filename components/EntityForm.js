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

const DIGIT_LIMITS = Object.freeze({ documento: 14, cep: 8, telefone: 11 });
const DIGIT_FIELDS = Object.keys(DIGIT_LIMITS);
const UPPER_FIELDS = new Set(["nome"]);
const ENTITY_LABEL = { client: "Cliente", supplier: "Fornecedor" };

export function EntityForm({ form, setForm }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "radio" && name === "entityType") {
      return setForm((p) => ({ ...p, entityType: value }));
    }
    if (type === "checkbox" && name === "documento_pendente") {
      return setForm((p) => ({
        ...p,
        documento_pendente: checked,
        documento: checked ? "" : p.documento,
        document_status: checked ? "pending" : p.document_status,
      }));
    }
    if (type === "checkbox") {
      return setForm((p) => ({ ...p, [name]: checked }));
    }
    if (DIGIT_FIELDS.includes(name)) {
      const digits = stripDigits(value).slice(0, DIGIT_LIMITS[name]);
      return setForm((p) => ({ ...p, [name]: digits }));
    }
    if (UPPER_FIELDS.has(name)) {
      return setForm((p) => ({ ...p, [name]: value.toUpperCase() }));
    }
    setForm((p) => ({ ...p, [name]: value }));
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
    alert(`${ENTITY_LABEL[form.entityType] || "Entidade"} cadastrado!\n` + JSON.stringify(form, null, 2));
  };

  const isClient = form.entityType === "client";
  const documentIsCnpj = isDocumentCnpj(form.documento);
  const formatted = {
    ...form,
    documento: formatCpfCnpj(form.documento),
    cep: formatCep(form.cep),
    telefone: formatTelefone(form.telefone),
  };

  return (
    <FormContainer
      title={`Formulário de ${isClient ? "Cliente" : "Fornecedor"}`}
      onSubmit={handleSubmit}
    >
      <div >
        <div className="card p-1 space-y-2">
          <EntityTypeSelector value={form.entityType} onChange={handleChange} />
          <DocumentSection
            form={formatted}
            isDocumentCnpj={documentIsCnpj}
            onChange={handleChange}
            onBlurDocumento={handleBlurDocumento}
          />
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          <div className="card p-1 space-y-2">
            <AddressSection form={formatted} onChange={handleChange} />
          </div>
          <div className="card p-1 space-y-2">
            <ContactSection form={formatted} onChange={handleChange} />
          </div>
          <div className="card p-1 space-y-2">
            <StatusToggle checked={form.ativo} onChange={handleChange} />
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" size="md" fullWidth={false} className="min-w-[120px]">
            Salvar
          </Button>
        </div>
      </div>
    </FormContainer>
  );
}
