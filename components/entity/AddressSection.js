import React from "react";
import { FormField } from "../ui/Form";

export function AddressSection({ form, onChange }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Endereço</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="col-span-1">
          <FormField
            label="CEP"
            name="cep"
            value={form.cep}
            onChange={onChange}
          />
        </div>
        <div className="col-span-1">
          <FormField
            label="Número"
            name="numero"
            value={form.numero}
            onChange={onChange}
          />
        </div>
        <div className="col-span-2">
          <FormField
            label="Complemento"
            name="complemento"
            value={form.complemento}
            onChange={onChange}
          />
        </div>
      </div>
    </div>
  );
}
