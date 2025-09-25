// Utilitários de formatação comuns

export function formatBRL(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `R$ ${n.toFixed(2)}`;
}

export function formatQtyBR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
