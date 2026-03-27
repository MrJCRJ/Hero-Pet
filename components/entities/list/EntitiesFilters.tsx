"use client";

import React, { useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Download, Upload } from "lucide-react";
import { Button } from "components/ui/Button";

const STATUS_OPTIONS = [
  { value: "", label: "(todos)" },
  { value: "valid", label: "Válido" },
  { value: "pending", label: "Pendente" },
  { value: "provisional", label: "Provisório" },
];
const FILL_OPTIONS = [
  { value: "", label: "(todos)" },
  { value: "completo", label: "Completo" },
  { value: "parcial", label: "Parcial" },
  { value: "vazio", label: "Vazio" },
];

const fieldBase =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-sm px-2 py-1 text-sm text-[var(--color-text-primary)] transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] placeholder:text-[var(--color-text-secondary)]/60 disabled:opacity-50";

/* eslint-disable no-unused-vars -- callback param names in interface */
interface EntitiesFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  profileFilter: string;
  onProfileChange: (value: string) => void;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  loading?: boolean;
  addressFillFilter: string;
  onAddressFillChange: (value: string) => void;
  contactFillFilter: string;
  onContactFillChange: (value: string) => void;
  hasOrdersFilter?: string;
  onHasOrdersChange?: (value: string) => void;
  advancedOpen?: boolean;
  onAdvancedToggle?: () => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  onImportCsv?: () => void;
  exporting?: "csv" | "xlsx" | null;
  importing?: boolean;
}
/* eslint-enable no-unused-vars */

export function EntitiesFilters({
  statusFilter,
  onStatusChange,
  profileFilter,
  onProfileChange,
  searchFilter,
  onSearchChange,
  loading,
  addressFillFilter,
  onAddressFillChange,
  contactFillFilter,
  onContactFillChange,
  hasOrdersFilter = "",
  onHasOrdersChange,
  advancedOpen = false,
  onAdvancedToggle,
  onClearFilters,
  hasActiveFilters = false,
  onExportCsv,
  onExportExcel,
  onImportCsv,
  exporting = null,
  importing = false,
}: EntitiesFiltersProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastCursorPositionRef = useRef(0);
  const wasFocusedRef = useRef(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    lastCursorPositionRef.current = e.target.selectionStart ?? 0;
    onSearchChange(e.target.value);
  };

  const handleFocus = () => {
    wasFocusedRef.current = true;
  };

  const handleBlur = () => {
    wasFocusedRef.current = false;
  };

  useEffect(() => {
    if (wasFocusedRef.current && searchInputRef.current) {
      const input = searchInputRef.current;
      if (document.activeElement !== input) {
        input.focus();
        const cursorPos = Math.min(
          lastCursorPositionRef.current,
          searchFilter.length,
        );
        input.setSelectionRange(cursorPos, cursorPos);
      }
    }
  });

  return (
    <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 backdrop-blur-md p-3 md:p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Busca - sempre visível */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
            Buscar
          </label>
          <input
            ref={searchInputRef}
            id="entities-search-filter"
            type="text"
            placeholder="Nome ou documento..."
            disabled={loading}
            className={fieldBase}
            value={searchFilter}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        {/* Perfil - sempre visível */}
        <div className="min-w-[120px]">
          <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
            Perfil
          </label>
          <div className="relative">
            <select
              id="entities-profile-filter"
              disabled={loading}
              className={`${fieldBase} pr-7 appearance-none cursor-pointer`}
              value={profileFilter}
              onChange={(e) => onProfileChange(e.target.value)}
            >
              <option value="">(todos)</option>
              <option value="reseller">Casa de Ração</option>
              <option value="final_customer">Cliente Final</option>
              <option value="supplier">Fornecedor</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-secondary)]">
              ▾
            </span>
          </div>
        </div>

        {/* Filtros avançados */}
        {onAdvancedToggle && (
          <button
            type="button"
            onClick={onAdvancedToggle}
            className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {advancedOpen ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
            Filtros avançados
          </button>
        )}

        {/* Limpar / Exportar */}
        <div className="flex gap-2 ml-auto items-center">
          {onExportCsv && (
            <Button
              variant="outline"
              size="sm"
              fullWidth={false}
              onClick={onExportCsv}
              disabled={!!exporting || loading}
            >
              <Download className="h-4 w-4 mr-1" aria-hidden />
              {exporting === "csv" ? "..." : "CSV"}
            </Button>
          )}
          {onExportExcel && (
            <Button
              variant="outline"
              size="sm"
              fullWidth={false}
              onClick={onExportExcel}
              disabled={!!exporting || loading}
            >
              <Download className="h-4 w-4 mr-1" aria-hidden />
              {exporting === "xlsx" ? "..." : "Excel"}
            </Button>
          )}
          {onImportCsv && (
            <Button
              variant="outline"
              size="sm"
              fullWidth={false}
              onClick={onImportCsv}
              disabled={!!importing || loading}
            >
              <Upload className="h-4 w-4 mr-1" aria-hidden />
              {importing ? "Importando..." : "Importar CSV"}
            </Button>
          )}
          {onClearFilters && hasActiveFilters && (
            <Button
              variant="outline"
              fullWidth={false}
              onClick={onClearFilters}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Painel avançado */}
      {advancedOpen && (
        <div className="flex flex-wrap gap-4 items-end mt-4 pt-4 border-t border-[var(--color-border)]">
          <div className="min-w-[120px]">
            <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
              Status
            </label>
            <div className="relative">
              <select
                id="entities-status-filter"
                disabled={loading}
                className={`${fieldBase} pr-7 appearance-none cursor-pointer`}
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-secondary)]">
                ▾
              </span>
            </div>
          </div>

          <div className="min-w-[120px]">
            <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
              Endereço
            </label>
            <div className="relative">
              <select
                id="entities-address-fill"
                disabled={loading}
                className={`${fieldBase} pr-7 appearance-none cursor-pointer`}
                value={addressFillFilter}
                onChange={(e) => onAddressFillChange(e.target.value)}
              >
                {FILL_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-secondary)]">
                ▾
              </span>
            </div>
          </div>

          <div className="min-w-[120px]">
            <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
              Contato
            </label>
            <div className="relative">
              <select
                id="entities-contact-fill"
                disabled={loading}
                className={`${fieldBase} pr-7 appearance-none cursor-pointer`}
                value={contactFillFilter}
                onChange={(e) => onContactFillChange(e.target.value)}
              >
                {FILL_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-secondary)]">
                ▾
              </span>
            </div>
          </div>

          {onHasOrdersChange && (
            <div className="min-w-[140px]">
              <label className="block text-[10px] uppercase tracking-wide font-semibold text-[var(--color-text-secondary)] mb-1">
                Pedidos
              </label>
              <div className="relative">
                <select
                  id="entities-has-orders"
                  disabled={loading}
                  className={`${fieldBase} pr-7 appearance-none cursor-pointer`}
                  value={hasOrdersFilter}
                  onChange={(e) => onHasOrdersChange(e.target.value)}
                >
                  <option value="">(todos)</option>
                  <option value="1">Com pedidos</option>
                  <option value="0">Sem pedidos</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-secondary)]">
                  ▾
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
