"use client";

import React from "react";

export interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: React.ReactNode;
}

export function KPICard({ label, value, subtitle }: KPICardProps) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{subtitle}</p>
      )}
    </div>
  );
}
