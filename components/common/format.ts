// Utilitários de formatação comuns

export function formatBRL(
  value: number | string | null | undefined
): string {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const formatted = n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Normaliza NBSP para espaço normal para evitar divergências em testes/HTML
  return formatted.replace(/\u00A0/g, " ");
}

export function formatQtyBR(
  value: number | string | null | undefined
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
