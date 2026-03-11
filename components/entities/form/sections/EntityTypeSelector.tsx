import React from "react";

export function EntityTypeSelector({ value, onChange }) {
  const options = [
    { value: "client", label: "Cliente" },
    { value: "supplier", label: "Fornecedor" },
  ];
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
        Tipo de Entidade
      </h3>
      <div className="inline-flex rounded-md overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-sm">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`px-4 py-2 text-xs font-medium cursor-pointer select-none transition-colors ${active ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"} ${!active ? "border-r border-[var(--color-border)] last:border-r-0" : "last:border-r-0"}`}
            >
              <input
                type="radio"
                name="entityType"
                value={opt.value}
                checked={active}
                onChange={onChange}
                className="hidden"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
