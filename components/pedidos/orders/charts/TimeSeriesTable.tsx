/* eslint-disable no-unused-vars -- param names in interface are for typing */
import React from "react";
import { formatMoney, formatPercent } from "./shared/formatters";

interface TimeSeriesTableProps {
  data: Array<Record<string, unknown> & { label: string }>;
  columns: Array<{
    key: string;
    header: string;
    colSpan?: string;
    align?: "left" | "right";
    render?: (
      row: Record<string, unknown>,
      helpers: { formatMoney: (n: number) => string; formatPercent: (n: number, o?: { withSign?: boolean }) => string }
    ) => React.ReactNode;
  }>;
  activeLabel?: string | null;
  onRowClick?: (row: unknown) => void;
  getRowClass?: (row: Record<string, unknown>) => string;
}

export default function TimeSeriesTable({
  data,
  columns,
  activeLabel,
  onRowClick,
  getRowClass,
}: TimeSeriesTableProps) {
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
                {(col.render
                  ? col.render(row, { formatMoney, formatPercent })
                  : (typeof row[col.key] === "object" && row[col.key] !== null
                      ? "—"
                      : row[col.key] ?? "—")) as React.ReactNode}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
