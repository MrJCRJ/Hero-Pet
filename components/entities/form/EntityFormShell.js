import React from "react";
import { FormContainer } from "components/ui/Form";
import { Button } from "components/ui/Button";
import { EntityTypeSelector, DocumentSection, AddressSection, ContactSection, StatusToggle } from "./index";

export function EntityFormShell({
  form,
  formatted,
  documentIsCnpj,
  isClient,
  editingId,
  submitting,
  error,
  onSubmit,
  onCancel,
  onChange,
  onBlurDocumento,
}) {
  return (
    <FormContainer title="Formulário de Cliente / Fornecedor" onSubmit={onSubmit}>
      <div className="space-y-4">
        <h2 className="text-base font-semibold">
          {editingId
            ? `Editando ${isClient ? "Cliente" : "Fornecedor"}`
            : `Novo ${isClient ? "Cliente" : "Fornecedor"}`}
        </h2>
        <div className="card p-2 space-y-2">
          <EntityTypeSelector value={form.entityType} onChange={onChange} />
          <DocumentSection
            form={formatted}
            isDocumentCnpj={documentIsCnpj}
            onChange={onChange}
            onBlurDocumento={onBlurDocumento}
          />
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          <div className="card p-1 space-y-2">
            <AddressSection form={formatted} onChange={onChange} />
          </div>
          <div className="card p-1 space-y-2">
            <ContactSection form={formatted} onChange={onChange} />
          </div>
          <div className="card p-1 space-y-2">
            <StatusToggle checked={form.ativo} onChange={onChange} />
          </div>
        </div>
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
            {error}
          </div>
        )}
        <div className="flex justify-end pt-1 gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth={false}
            disabled={submitting}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth={false}
            className="min-w-[120px]"
            disabled={submitting}
            loading={submitting}
          >
            {submitting
              ? editingId
                ? "Atualizando..."
                : "Salvando..."
              : editingId
                ? "Atualizar"
                : "Salvar"}
          </Button>
        </div>
      </div>
    </FormContainer>
  );
}
