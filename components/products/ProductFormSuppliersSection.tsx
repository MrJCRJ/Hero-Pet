import React from "react";
import { Button } from "components/ui/Button";

export function ProductFormSuppliersSection({
  suppliers,
  supplierLabels,
  setShowSupplierModal,
  clearSuppliers,
  removeSupplier,
}) {
  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="block">Fornecedores *</span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            fullWidth={false}
            onClick={() => setShowSupplierModal(true)}
          >
            Adicionar fornecedor
          </Button>
          {suppliers.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onClick={() => clearSuppliers()}
            >
              Limpar
            </Button>
          )}
        </div>
      </div>
      <div className="min-h-[38px] px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        {supplierLabels.length ? (
          <div className="flex flex-wrap gap-2">
            {supplierLabels.map((s) => (
              <span
                key={s.id}
                className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)]"
              >
                {s.label}
                <button
                  className="ml-2 opacity-70 hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    removeSupplier(s.id);
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="opacity-60 text-xs">
            Nenhum fornecedor selecionado
          </span>
        )}
      </div>
    </div>
  );
}

export default ProductFormSuppliersSection;
