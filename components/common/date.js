// Utilitários de data comuns (UI)

// Formata "YYYY-MM-DD" (ou ISO) para dd/mm/aaaa sem aplicar timezone
export function formatYMDToBR(isoLike) {
  if (!isoLike) return "-";
  const s = String(isoLike);
  const ymd = s.slice(0, 10);
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return "-";
  return `${d}/${m}/${y}`;
}

// Formata data/hora para pt-BR de maneira consistente
// Aceita Date, ISO string ou timestamp numérico
export function formatDateTimeBR(value) {
  if (!value) return "-";
  let d;
  if (value instanceof Date) d = value;
  else if (typeof value === "number") d = new Date(value);
  else d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "-";
  try {
    return d.toLocaleString("pt-BR");
  } catch {
    // Fallback simples dd/mm/aaaa HH:MM
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
