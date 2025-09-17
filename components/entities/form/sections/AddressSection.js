import React from "react";
import { FormField } from "components/ui/Form";

export function AddressSection({ form, onChange }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] pb-4">
        Endereço
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="CEP"
          name="cep"
          value={form.cep}
          onChange={onChange}
          maxLength={9}
        />
        <FormField
          label="Número"
          name="numero"
          value={form.numero}
          onChange={onChange}
        />
      </div>
      <FormField
        label="Complemento"
        name="complemento"
        value={form.complemento}
        onChange={onChange}
      />
    </div>
  );
}
