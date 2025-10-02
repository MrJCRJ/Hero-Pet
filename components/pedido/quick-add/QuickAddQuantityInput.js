import React from "react";

export function QuickAddQuantityInput({ value, onChange }) {
  return (
    <div>
      <label htmlFor="qa_quantidade" className="block text-xs mb-1">
        Quantidade
      </label>
      <input
        id="qa_quantidade"
        type="number"
        step="1"
        className="w-full border rounded px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
