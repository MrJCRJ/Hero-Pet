import React from "react";

export function QuickAddDiscountInput({ value, onChange }) {
  return (
    <div>
      <label htmlFor="qa_desconto" className="block text-xs mb-1">
        Desconto Unitário
      </label>
      <input
        id="qa_desconto"
        type="number"
        step="0.01"
        className="w-full border rounded px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
