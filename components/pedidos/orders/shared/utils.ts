/**
 * Utilitários para componentes de pedidos
 */

/**
 * Trunca um nome para um tamanho máximo
 * @param {string} name - Nome a ser truncado
 * @param {number} max - Tamanho máximo (padrão: 18)
 * @returns {string} Nome truncado
 */
export function truncateName(name: string | null | undefined, max = 18): string {
  if (!name) return "";
  const str = String(name);
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

/**
 * Converte uma data para o formato YYYY-MM
 * @param {Date|string} d - Data a ser convertida
 * @returns {string} Data no formato YYYY-MM
 */
export function yyyyMM(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Converte YYYY-MM para um rótulo amigável (ex: "set/2025")
 * @param {string} yyyyDashMM - Data no formato YYYY-MM
 * @returns {string} Rótulo formatado
 */
export function monthToLabel(yyyyDashMM: string | null | undefined): string {
  const s = String(yyyyDashMM || "");
  if (!/^\d{4}-\d{2}$/.test(s)) return s;
  const [y, m] = s.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const monthShort = d
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return `${monthShort}/${y}`;
}

/**
 * Retorna os limites (from/to) para um mês no formato YYYY-MM
 * @param {string} yyyyMM - Mês no formato YYYY-MM
 * @returns {Object} Objeto com propriedades from e to
 */
export function boundsFromYYYYMM(
  yyyyMM: string | null | undefined
): { from: string | null; to: string | null } {
  const s = String(yyyyMM || "");
  if (!/^\d{4}-\d{2}$/.test(s)) return { from: null, to: null };
  const [y, m] = s.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const next = new Date(y, m, 1);
  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  // 'to' inclusivo: dia anterior ao próximo mês
  const toDate = new Date(next.getTime() - 24 * 60 * 60 * 1000);
  return { from: ymd(start), to: ymd(toDate) };
}

/**
 * Formata uma data YYYY-MM-DD para DD/MM/YYYY
 * @param {string} ymdDate - Data no formato YYYY-MM-DD
 * @returns {string} Data formatada
 */
export function formatYMDToBR(ymdDate: string | null | undefined): string {
  if (!ymdDate) return "";
  const [y, m, d] = ymdDate.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Formata um valor para moeda brasileira
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado em BRL
 */
export function formatBRL(value: number | string | null | undefined): string {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

/**
 * Dispara evento personalizado para filtrar pedidos
 * @param {Object} detail - Detalhes do filtro
 */
export function dispatchOrdersFilter(detail: Record<string, unknown>): void {
  try {
    window.dispatchEvent(new CustomEvent("orders:set-filters", { detail }));
  } catch (e) {
    // noop
  }
}
