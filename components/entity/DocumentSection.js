import React from "react";
import { FormField } from "../ui/Form";

const STATUS_STYLES = {
  pending: "bg-gray-200 text-gray-700",
  provisional: "bg-amber-200 text-amber-800",
  valid: "bg-emerald-200 text-emerald-800",
};

export function DocumentSection({
  form,
  isDocumentCnpj,
  onChange,
  onBlurDocumento,
}) {
  const badgeClass =
    STATUS_STYLES[form.document_status] || "bg-gray-100 text-gray-600";
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {isDocumentCnpj ? "Dados da Empresa" : "Dados Pessoais"}
        </h3>
        {statusLabel && (
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${badgeClass}`}
          >
            {statusLabel}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mb-4">
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
          className="text-sm text-[var(--color-text-secondary)]"
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
        <p className="mt-2 text-xs text-gray-600">
          Marcação de pendência: você pode salvar sem informar o documento
          agora.
        </p>
      )}
    </div>
  );
}
