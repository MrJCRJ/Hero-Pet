import React from "react";
import { formatMoney, formatPercent } from "./shared/formatters";

/**
 * Componente genérico de tabela para séries temporais.
 * Props:
 *  - data: array de objetos com pelo menos { label }
 *  - columns: array de { key, header, align?: 'left'|'right', render?: (row)=>ReactNode }
 *  - activeLabel: rótulo ativo para highlight
 *  - onRowClick?: (row)=>void
 *  - getRowClass?: (row)=>string extra
 */
export default function TimeSeriesTable({
  data,
  columns,
  activeLabel,
  onRowClick,
  getRowClass,
}) {
  return (
    <div>
      <div className="grid grid-cols-12 text-xs mt-3 font-medium text-gray-500 dark:text-gray-400">
        {columns.map((col) => (
          <div
            key={col.key}
            className={`${col.colSpan || "col-span-3"} ${col.align === "right" ? "text-right" : ""}`}
          >
            {col.header}
          </div>
        ))}
      </div>
      {data.map((row) => {
        const isActive = activeLabel === row.label;
        return (
          <div
            key={row.label}
            className={`grid grid-cols-12 text-xs py-0.5 border-b border-gray-100 dark:border-gray-800 last:border-none cursor-pointer hover:bg-[var(--color-bg-secondary)] ${isActive ? "bg-[var(--color-bg-secondary)]" : ""} ${getRowClass ? getRowClass(row) : ""}`}
            onClick={() => onRowClick && onRowClick(row)}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className={`${col.colSpan || "col-span-3"} ${col.align === "right" ? "text-right" : ""}`}
              >
                {col.render
                  ? col.render(row, { formatMoney, formatPercent })
                  : (row[col.key] ?? "—")}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
