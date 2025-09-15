import React from "react";

export function EntityTypeSelector({ value, onChange }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">
        Tipo de Entidade
      </h3>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            id="entityTypeClient"
            name="entityType"
            value="client"
            checked={value === "client"}
            onChange={onChange}
            className="w-4 h-4 accent-[var(--color-accent)]"
          />
          <label
            htmlFor="entityTypeClient"
            className="text-[var(--color-text-secondary)] cursor-pointer"
          >
            Cliente
          </label>
        </div>
        <div className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            id="entityTypeSupplier"
            name="entityType"
            value="supplier"
            checked={value === "supplier"}
            onChange={onChange}
            className="w-4 h-4 accent-[var(--color-accent)]"
          />
          <label
            htmlFor="entityTypeSupplier"
            className="text-[var(--color-text-secondary)] cursor-pointer"
          >
            Fornecedor
          </label>
        </div>
      </div>
    </div>
  );
}
