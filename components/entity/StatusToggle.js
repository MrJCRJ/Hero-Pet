import React from "react";

export function StatusToggle({ checked, onChange }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">
        Status
      </h3>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="ativo"
          checked={checked}
          onChange={onChange}
          className="w-4 h-4 accent-[var(--color-accent)] border-[var(--color-border)]"
        />
        <span className="text-[var(--color-text-secondary)]">Ativo</span>
      </div>
    </div>
  );
}
