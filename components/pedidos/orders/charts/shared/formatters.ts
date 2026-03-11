import { formatBRL } from "../../shared/utils";

export function formatMoney(
  value: number | string | null | undefined
): string {
  return formatBRL(Number(value || 0));
}

interface FormatPercentOptions {
  withSign?: boolean;
  digits?: number;
}

export function formatPercent(
  value: number | null | undefined,
  { withSign = true, digits = 1 }: FormatPercentOptions = {}
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = withSign && value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}
