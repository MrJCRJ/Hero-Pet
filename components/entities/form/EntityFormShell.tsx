import React from "react";
import Link from "next/link";
import { FormContainer } from "components/ui/Form";
import { Button } from "components/ui/Button";
import {
  EntityTypeSelector,
  DocumentSection,
  AddressSection,
  ContactSection,
  ObservacaoSection,
  StatusToggle,
} from "./index";

/* eslint-disable no-unused-vars -- callback param names in type */
type EntityFormShellProps = {
  form: Record<string, unknown>;
  formatted: Record<string, unknown>;
  documentIsCnpj: boolean;
  isClient: boolean;
  editingId: number | null;
  submitting: boolean;
  error: string | null;
  conflictEntityId?: number | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onChange: (e: { target: { name: string; value: unknown } }) => void;
  onBlurDocumento?: () => void;
  embedded?: boolean;
};
/* eslint-enable no-unused-vars */

export function EntityFormShell({
  form,
  formatted,
  documentIsCnpj,
  isClient,
  editingId,
  submitting,
  error,
  conflictEntityId = null,
  onSubmit,
  onCancel,
  onChange,
  onBlurDocumento,
  embedded = false,
}: EntityFormShellProps) {
  const content = (
    <div className="space-y-4">
      {!embedded && (
        <h2 className="text-base font-semibold">
          {editingId
            ? `Editando ${isClient ? "Cliente" : "Fornecedor"}`
            : `Novo ${isClient ? "Cliente" : "Fornecedor"}`}
        </h2>
      )}
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
          <div className="card p-1 space-y-2 lg:col-span-2">
            <ObservacaoSection form={formatted} onChange={onChange} />
          </div>
        </div>
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2 py-1 rounded">
          {error}
          {conflictEntityId && (
            <span className="ml-2">
              <Link
                href={`/entities?edit=${conflictEntityId}`}
                className="underline hover:no-underline"
              >
                Visualizar existente
              </Link>
            </span>
          )}
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
  );

  if (embedded) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e);
        }}
      >
        {content}
      </form>
    );
  }

  return (
    <FormContainer
      title="Formulário de Cliente / Fornecedor"
      onSubmit={onSubmit}
    >
      {content}
    </FormContainer>
  );
}
