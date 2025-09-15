import React from "react";
import { FormField } from "../ui/Form";

export function DocumentSection({ form, isDocumentCnpj, onChange }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">
        {isDocumentCnpj ? "Dados da Empresa" : "Dados Pessoais"}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label={isDocumentCnpj ? "Razão Social" : "Nome"}
          name="nome"
          value={form.nome}
          onChange={onChange}
          required
        />
        <FormField
          label={isDocumentCnpj ? "CNPJ" : "CPF"}
          name="documento"
          value={form.documento}
          onChange={onChange}
          required
          // Máscara controla tamanho; validação posterior pode ser feita ao submit
          title={
            isDocumentCnpj
              ? "Digite o CNPJ (14 dígitos)"
              : "Digite o CPF (11 dígitos)"
          }
        />
      </div>
    </div>
  );
}
