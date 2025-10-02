import { formatBRL } from "../../shared/utils";

export function formatMoney(value) {
  return formatBRL(Number(value || 0));
}

export function formatPercent(value, { withSign = true, digits = 1 } = {}) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = withSign && value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}
