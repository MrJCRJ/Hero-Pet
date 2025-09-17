import React from "react";

const STATUS_OPTIONS = ["", "pending", "provisional", "valid"];
const FILL_OPTIONS = ["", "completo", "parcial", "vazio"];

export function EntitiesFilters({
  statusFilter,
  onStatusChange,
  profileFilter,
  onProfileChange,
  loading,
  addressFillFilter,
  onAddressFillChange,
  contactFillFilter,
  onContactFillChange,
}) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col">
        <label htmlFor="entities-status-filter" className="text-[10px] font-medium mb-1">
          Status
        </label>
        <div className="relative">
          <select
            id="entities-status-filter"
            disabled={loading}
            className="peer appearance-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 backdrop-blur-sm rounded px-2 py-1 text-[10px] pr-6 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg-secondary)]"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt || "all"} value={opt} className="text-[var(--color-text-primary)]">
                {opt || "(todos)"}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[8px] text-[var(--color-text-secondary)] peer-focus:text-[var(--color-accent)] transition-colors" aria-hidden="true">
            ▼
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <label htmlFor="entities-profile-filter" className="text-[10px] font-medium mb-1">
          Perfil
        </label>
        <div className="relative">
          <select
            id="entities-profile-filter"
            disabled={loading}
            className="peer appearance-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 backdrop-blur-sm rounded px-2 py-1 text-[10px] pr-6 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
            value={profileFilter}
            onChange={(e) => onProfileChange(e.target.value)}
          >
            <option value="">(todos)</option>
            <option value="client">Cliente</option>
            <option value="supplier">Fornecedor</option>
          </select>
          <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[8px] text-[var(--color-text-secondary)]" aria-hidden="true">
            ▼
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <label htmlFor="entities-address-fill" className="text-[10px] font-medium mb-1">
          Endereço
        </label>
        <div className="relative">
          <select
            id="entities-address-fill"
            disabled={loading}
            className="peer appearance-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 backdrop-blur-sm rounded px-2 py-1 text-[10px] pr-6 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
            value={addressFillFilter}
            onChange={(e) => onAddressFillChange(e.target.value)}
          >
            {FILL_OPTIONS.map((opt) => (
              <option key={opt || "all"} value={opt}>
                {opt || "(todos)"}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[8px] text-[var(--color-text-secondary)]" aria-hidden="true">
            ▼
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <label htmlFor="entities-contact-fill" className="text-[10px] font-medium mb-1">
          Contato
        </label>
        <div className="relative">
          <select
            id="entities-contact-fill"
            disabled={loading}
            className="peer appearance-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 backdrop-blur-sm rounded px-2 py-1 text-[10px] pr-6 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
            value={contactFillFilter}
            onChange={(e) => onContactFillChange(e.target.value)}
          >
            {FILL_OPTIONS.map((opt) => (
              <option key={opt || "all"} value={opt}>
                {opt || "(todos)"}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[8px] text-[var(--color-text-secondary)]" aria-hidden="true">
            ▼
          </span>
        </div>
      </div>

      {loading && (
        <span className="text-[10px] text-[var(--color-text-secondary)] animate-pulse">
          Carregando...
        </span>
      )}
    </div>
  );
}
