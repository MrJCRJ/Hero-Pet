"use client";

import React from "react";
import { formatBrl } from "./shared/utils";

export interface ResumoViewProps {
  data: {
    crescimentoMoMPerc?: number | null;
    vendasMes?: number;
    vendasMesAnterior?: number;
    lucroBrutoMes?: number;
    margemBrutaPerc?: number;
    cogsReal?: number;
    comprasMes?: number;
  };
  mes: number;
  ano: number;
}

export function ResumoView({ data, mes, ano }: ResumoViewProps) {
  const crescimento =
    data.crescimentoMoMPerc != null
      ? `${Number(data.crescimentoMoMPerc).toFixed(2)}%`
      : "—";
  const lucroBruto =
    data.lucroBrutoMes != null && data.margemBrutaPerc != null
      ? `${formatBrl(Number(data.lucroBrutoMes))} (${Number(data.margemBrutaPerc).toFixed(2)}%)`
      : "—";
  const comprasMes = data.comprasMes != null ? formatBrl(Number(data.comprasMes)) : "—";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
        Resumo do mês — {new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long" })}/{ano}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Crescimento (MoM)
          </h3>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">{crescimento}</p>
          {(data.vendasMes != null || data.vendasMesAnterior != null) && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Receita: {formatBrl(Number(data.vendasMes || 0))} · Anterior:{" "}
              {formatBrl(Number(data.vendasMesAnterior || 0))}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Lucro bruto
          </h3>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">{lucroBruto}</p>
          {(data.vendasMes != null || data.cogsReal != null) && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Receita: {formatBrl(Number(data.vendasMes || 0))} · COGS:{" "}
              {formatBrl(Number(data.cogsReal || 0))}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Compras do mês
          </h3>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">{comprasMes}</p>
        </div>
      </div>
    </div>
  );
}
