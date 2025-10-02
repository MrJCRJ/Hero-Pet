import React from "react";
import { Button } from "../../ui/Button";

// Estilos base compartilhados para inputs/select com foco moderno
const fieldBase =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-sm px-2 py-1 text-sm text-[var(--color-text-primary)] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-secondary)]/60 disabled:opacity-50";

export default function FilterBar({ filters, onChange, onReload }) {
  // Persistência local de filtros (tipo, q, from, to)
  React.useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    try {
      const payload = {
        tipo: filters.tipo,
        q: filters.q,
        from: filters.from,
        to: filters.to,
      };
      window.localStorage.setItem("orders.filters", JSON.stringify(payload));
    } catch (_) {
      /* ignore */
    }
  }, [filters.tipo, filters.q, filters.from, filters.to]);
  return (
    <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 backdrop-blur-md p-3 md:p-4 flex flex-wrap gap-4 items-end shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      {/* Tipo */}
      <div className="min-w-[130px]">
        <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
          Tipo
        </label>
        <div className="relative">
          <select
            className={fieldBase + " pr-7 appearance-none cursor-pointer"}
            value={filters.tipo}
            onChange={(e) => onChange({ ...filters, tipo: e.target.value })}
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
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
        />
      </div>

      {/* Data De */}
      <div className="min-w-[150px]">
        <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
          De
        </label>
        <input
          type="date"
          className={
            fieldBase + " calendar-icon-white fallback-icon cursor-pointer"
          }
          value={filters.from || ""}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
        />
      </div>

      {/* Data Até */}
      <div className="min-w-[150px]">
        <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
          Até
        </label>
        <input
          type="date"
          className={
            fieldBase + " calendar-icon-white fallback-icon cursor-pointer"
          }
          value={filters.to || ""}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
        />
      </div>

      {/* Botões */}
      <div className="flex gap-2 ml-auto">
        <Button
          fullWidth={false}
          variant="outline"
          onClick={() => onChange({ tipo: "", q: "", from: "", to: "" })}
        >
          Limpar
        </Button>
        <Button fullWidth={false} onClick={onReload}>
          Atualizar
        </Button>
      </div>
    </div>
  );
}
