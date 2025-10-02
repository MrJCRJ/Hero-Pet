import React from "react";

export function QuickAddPriceInput({ value, onChange }) {
  return (
    <div>
      <label htmlFor="qa_preco" className="block text-xs mb-1">
        Preço Unitário
      </label>
      <input
        id="qa_preco"
        type="number"
        step="0.01"
        className="w-full border rounded px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
