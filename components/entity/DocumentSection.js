import React from "react";
import { FormField } from "../ui/Form";

const STATUS_CLASSES = {
  pending: 'badge badge-warning',
  provisional: 'badge badge-info',
  valid: 'badge badge-success'
};

export function DocumentSection({
  form,
  isDocumentCnpj,
  onChange,
  onBlurDocumento,
}) {
  const badgeClass = STATUS_CLASSES[form.document_status] || 'badge';
  const labelDoc = isDocumentCnpj ? "CNPJ" : "CPF";
  const labelNome = isDocumentCnpj ? "Razão Social" : "Nome";
  const statusLabel =
    form.document_status === "pending"
      ? "PENDENTE"
      : form.document_status === "provisional"
        ? "PROVISÓRIO"
        : form.document_status === "valid"
          ? "VALIDADO"
          : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center flex-wrap gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          {isDocumentCnpj ? "Dados da Empresa" : "Dados Pessoais"}
        </h3>
        {statusLabel && (<span className={badgeClass}>{statusLabel}</span>)}
        <div className="h-4 w-px bg-[var(--color-border)]" />
        <input
          type="checkbox"
          id="documento_pendente"
          name="documento_pendente"
          checked={!!form.documento_pendente}
          onChange={onChange}
          className="h-4 w-4"
        />
        <label
          htmlFor="documento_pendente"
          className="text-xs text-[var(--color-text-secondary)]"
        >
          Documento ainda não disponível
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label={labelNome}
          name="nome"
          value={form.nome}
          onChange={onChange}
          required
        />
        <FormField
          label={labelDoc}
          name="documento"
          value={form.documento}
          onChange={onChange}
          onBlur={onBlurDocumento}
          disabled={!!form.documento_pendente}
          required={!form.documento_pendente}
          title={
            isDocumentCnpj
              ? "Digite o CNPJ (14 dígitos)"
              : "Digite o CPF (11 dígitos)"
          }
        />
      </div>
      {form.documento &&
        !form.documento_pendente &&
        form.document_status === "provisional" && (
          <p className="mt-2 text-xs text-amber-600">
            Documento não passou na validação. Será salvo como provisório,
            atualize quando tiver o oficial.
          </p>
        )}
      {form.documento_pendente && (
        <p className="mt-1 text-[10px] text-gray-500">
          Marcação de pendência: você pode salvar sem informar o documento
          agora.
        </p>
      )}
    </div>
  );
}
