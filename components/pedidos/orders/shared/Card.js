import React from "react";

/**
 * Componente Card reutilizável para exibir métricas
 */
export default function Card({ title, value, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left flex-1 min-w-[180px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-3 hover:bg-[var(--color-bg-primary)] transition-colors cursor-pointer"
    >
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
      {subtitle ? (
        <div className="text-[11px] opacity-70 mt-1">{subtitle}</div>
      ) : null}
    </button>
  );
}
