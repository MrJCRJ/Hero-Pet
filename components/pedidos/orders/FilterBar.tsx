"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../ui/Button";
import { ChevronDown, ChevronRight } from "lucide-react";

// Estilos base compartilhados para inputs/select com foco moderno
const fieldBase =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-sm px-2 py-1 text-sm text-[var(--color-text-primary)] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-secondary)]/60 disabled:opacity-50";

export default function FilterBar({ filters, onChange, onReload }) {
  const searchParams = useSearchParams();
  const [avancadoAberto, setAvancadoAberto] = React.useState(
    () => searchParams?.get("filtrosAvancados") === "1"
  );

  // Sincronizar com URL e localStorage
  React.useEffect(() => {
    const tipo = searchParams?.get("tipo") ?? filters.tipo;
    const q = searchParams?.get("q") ?? filters.q;
    const from = searchParams?.get("from") ?? filters.from;
    const to = searchParams?.get("to") ?? filters.to;
    const partner = searchParams?.get("partner") ?? filters.partner ?? "";
    const hasParams = searchParams?.has("tipo") || searchParams?.has("q") || searchParams?.has("from") || searchParams?.has("to") || searchParams?.has("partner");
    if (hasParams) {
      onChange({ ...filters, tipo, q, from, to, partner });
    } else {
      try {
        const saved = window.localStorage.getItem("orders.filters");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            onChange({ ...filters, ...parsed });
          }
        }
      } catch (_) {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atualizarUrl = React.useCallback(
    (novosFiltros) => {
      const params = new URLSearchParams(window.location.search);
      if (novosFiltros.tipo) params.set("tipo", novosFiltros.tipo);
      else params.delete("tipo");
      if (novosFiltros.q) params.set("q", novosFiltros.q);
      else params.delete("q");
      if (novosFiltros.from) params.set("from", novosFiltros.from);
      else params.delete("from");
      if (novosFiltros.to) params.set("to", novosFiltros.to);
      else params.delete("to");
      if (novosFiltros.partner) params.set("partner", novosFiltros.partner);
      else params.delete("partner");
      const qs = params.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState({}, "", url);
    },
    []
  );

  React.useEffect(() => {
    const payload = {
      tipo: filters.tipo,
      q: filters.q,
      from: filters.from,
      to: filters.to,
      partner: filters.partner ?? "",
    };
    try {
      window.localStorage.setItem("orders.filters", JSON.stringify(payload));
    } catch (_) {
      /* ignore */
    }
    atualizarUrl(filters);
  }, [filters.tipo, filters.q, filters.from, filters.to, filters.partner, atualizarUrl]);

  const handleChange = (novo) => {
    onChange({ ...filters, ...novo });
  };

  return (
    <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 backdrop-blur-md p-3 md:p-4 shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Tipo */}
        <div className="min-w-[130px]">
          <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
            Tipo
          </label>
          <div className="relative">
            <select
              className={fieldBase + " pr-7 appearance-none cursor-pointer"}
              value={filters.tipo}
              onChange={(e) => handleChange({ tipo: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="VENDA">VENDA</option>
              <option value="COMPRA">COMPRA</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-secondary)]">
              ▾
            </span>
          </div>
        </div>

        {/* Busca */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
            Busca
          </label>
          <input
            className={fieldBase}
            placeholder="ID (#123), parceiro ou documento"
            value={filters.q}
            onChange={(e) => handleChange({ q: e.target.value })}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setAvancadoAberto(!avancadoAberto);
            const params = new URLSearchParams(window.location.search);
            if (!avancadoAberto) params.set("filtrosAvancados", "1");
            else params.delete("filtrosAvancados");
            const qs = params.toString();
            window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
          }}
          className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          {avancadoAberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Filtros avançados
        </button>

        {/* Botões */}
        <div className="flex gap-2 ml-auto">
          <Button
            fullWidth={false}
            variant="outline"
            onClick={() => handleChange({ tipo: "", q: "", from: "", to: "", partner: "" })}
          >
            Limpar
          </Button>
          <Button fullWidth={false} onClick={onReload}>
            Atualizar
          </Button>
        </div>
      </div>

      {avancadoAberto && (
        <div className="flex flex-wrap gap-4 items-end mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="min-w-[150px]">
            <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
              De
            </label>
            <input
              type="date"
              className={fieldBase + " calendar-icon-white fallback-icon cursor-pointer"}
              value={filters.from || ""}
              onChange={(e) => handleChange({ from: e.target.value })}
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
              Até
            </label>
            <input
              type="date"
              className={fieldBase + " calendar-icon-white fallback-icon cursor-pointer"}
              value={filters.to || ""}
              onChange={(e) => handleChange({ to: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
