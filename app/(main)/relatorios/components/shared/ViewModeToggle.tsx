"use client";

import React from "react";
import { BarChart2, Table, LayoutGrid } from "lucide-react";

export type ViewMode = "chart" | "table" | "both";

export interface ViewModeToggleProps {
  value: ViewMode;
  // eslint-disable-next-line no-unused-vars -- callback type: param required by signature
  onChange: (value: ViewMode) => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded border border-[var(--color-border)] p-0.5">
      <button
        type="button"
        onClick={() => onChange("chart")}
        title="Apenas gráfico"
        className={`rounded p-1.5 transition ${
          value === "chart"
            ? "bg-[var(--color-accent)] text-white"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
        }`}
      >
        <BarChart2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        title="Apenas tabela"
        className={`rounded p-1.5 transition ${
          value === "table"
            ? "bg-[var(--color-accent)] text-white"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
        }`}
      >
        <Table className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("both")}
        title="Gráfico e tabela"
        className={`rounded p-1.5 transition ${
          value === "both"
            ? "bg-[var(--color-accent)] text-white"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
