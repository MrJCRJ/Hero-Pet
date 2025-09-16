import React from "react";
import { Button } from "./ui/Button";
import { FormContainer } from "./ui/Form";
import {
  EntityTypeSelector,
  DocumentSection,
  AddressSection,
  ContactSection,
  StatusToggle,
  applyChange,
  applyDocumentBlur,
  computeDerived,
  getEntityLabel,
} from "./entity";

export function EntityForm({ form, setForm }) {
  const handleChange = (e) => setForm((prev) => applyChange(prev, e.target));
  const handleBlurDocumento = () => setForm((prev) => applyDocumentBlur(prev));

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(
      `${getEntityLabel(form.entityType)} cadastrado!\n` +
        JSON.stringify(form, null, 2),
    );
  };

  const { isClient, documentIsCnpj, formatted } = computeDerived(form);

  return (
    <FormContainer
      title={`Formulário de ${isClient ? "Cliente" : "Fornecedor"}`}
      onSubmit={handleSubmit}
    >
      <div>
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
