import React from "react";

export function StatusToggle({ checked, onChange }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Status</h3>
      <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-[var(--color-text-secondary)]">
        <input
          type="checkbox"
          name="ativo"
          checked={checked}
          onChange={onChange}
          className="w-4 h-4 accent-[var(--color-accent)] border-[var(--color-border)]"
        />
        Ativo
      </label>
    </div>
  );
}
