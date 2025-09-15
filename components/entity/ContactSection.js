import React from "react";
import { FormField } from "../ui/Form";

export function ContactSection({ form, onChange }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Contato</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
        />
        <FormField
          label="Telefone"
          name="telefone"
          value={form.telefone}
          onChange={onChange}
          type="tel"
        />
      </div>
    </div>
  );
}
