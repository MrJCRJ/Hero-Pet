// Centraliza classes de estilo comuns para tabelas (headers sticky, linhas, etc.)

export const TABLE_CONTAINER_SCROLL =
  "overflow-auto border rounded max-h-[520px]";

export const TABLE_BASE = "min-w-full text-xs";

export const THEAD_STICKY =
  "sticky top-0 z-10 shadow-sm after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-[-6px] after:h-4 after:pointer-events-none after:bg-gradient-to-b after:from-[var(--color-bg-secondary)]/70 after:to-transparent";

export const THEAD_ROW =
  "relative bg-[var(--color-bg-secondary)]/95 backdrop-blur text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)] border-b border-[var(--color-border)]";

export const TH_BASE = "text-left px-3 py-1.5 font-semibold";

export const ACTION_TH = "text-center px-3 py-1.5 w-10 font-semibold";

export const ROW_HOVER =
  "group border-t hover:bg-[var(--color-bg-secondary)] cursor-pointer focus-within:bg-[var(--color-bg-secondary)]";

export const ACTION_BTN_HIDDEN =
  "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition";
