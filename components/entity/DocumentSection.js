// components/entity/DocumentSection.js

import React from "react";
import { FormField } from "../ui/Form";
import { StatusDot } from "../common/StatusDot";

const MESSAGES = {
  provisional: `Documento não passou na validação. Será salvo como provisório, atualize quando tiver o oficial.`,
  pending: `Marcação de pendência: você pode salvar sem informar o documento agora.`,
};

export function DocumentSection({
  form,
  isDocumentCnpj,
  onChange,
  onBlurDocumento,
}) {
  const labelDoc = isDocumentCnpj ? "CNPJ" : "CPF";
  const labelNome = isDocumentCnpj ? "Razão Social" : "Nome";
  const rawStatus = form.document_status || "";
  const visualStatus = rawStatus;

  // IDs para acessibilidade das mensagens dinâmicas
  const provisionalMsgId = "documento-provisional-msg";
  const pendingMsgId = "documento-pending-msg";

  // Define qual mensagem deve ser associada via aria-describedby ao campo de documento
  const describedBy = [
    form.document_status === "provisional" && !form.documento_pendente
      ? provisionalMsgId
      : null,
    form.documento_pendente ? pendingMsgId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      {/* Cabeçalho da seção com título, dot de status e checkbox de pendência */}
      <div className="flex items-center flex-wrap gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          {isDocumentCnpj ? "Dados da Empresa" : "Dados Pessoais"}
        </h3>
        {visualStatus && (
          <div
            className="flex items-center gap-2"
            title={rawStatus.toUpperCase()}
            aria-label={`Status do documento: ${rawStatus}`}
          >
            <StatusDot
              status={visualStatus}
              className="shadow ring-1 ring-[var(--color-border)]"
            />
          </div>
        )}
        <div className="h-4 w-px bg-[var(--color-border)]" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="documento_pendente"
            name="documento_pendente"
            checked={!!form.documento_pendente}
            onChange={onChange}
            className="h-4 w-4"
            aria-describedby={form.documento_pendente ? pendingMsgId : undefined}
          />
          <label
            htmlFor="documento_pendente"
            className="text-xs text-[var(--color-text-secondary)] cursor-pointer select-none"
          >
            Documento ainda não disponível
          </label>
        </div>
      </div>

      {/* Campos principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ">
        <FormField
          label={labelNome}
          name="nome"
          value={form.nome}
          onChange={onChange}
          required
          autoComplete="name"
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
          inputMode="numeric"
          aria-describedby={describedBy || undefined}
          autoComplete={isDocumentCnpj ? "organization" : "off"}
        />
      </div>

      {/* Mensagens dinâmicas informativas */}
      {form.documento &&
        !form.documento_pendente &&
        form.document_status === "provisional" && (
          <p
            id={provisionalMsgId}
            className=" text-xs text-amber-600"
            role="note"
          >
            {MESSAGES.provisional}
          </p>
        )}
      {form.documento_pendente && (
        <p
          id={pendingMsgId}
          className=" text-xs text-gray-500"
          role="note"
        >
          {MESSAGES.pending}
        </p>
      )}
    </div>
  );
}
