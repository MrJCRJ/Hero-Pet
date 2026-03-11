/**
 * Utilitários compartilhados pelos handlers de pedidos
 */

export function parseDateYMD(ymd: unknown): string | null {
  if (
    !ymd ||
    typeof ymd !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(ymd)
  )
    return null;
  return ymd;
}

export function toLocalMidnight(input: string | Date | null | undefined): Date {
  if (!input) return new Date();
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return new Date(
      input.getFullYear(),
      input.getMonth(),
      input.getDate()
    );
  }
  return new Date();
}

export function fmtYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
