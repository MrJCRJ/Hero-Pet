"use client";

interface EstoqueAlertaBadgeProps {
  saldo: number;
  estoqueMinimo: number | null | undefined;
}

export function EstoqueAlertaBadge({
  saldo,
  estoqueMinimo,
}: EstoqueAlertaBadgeProps) {
  const minimo =
    estoqueMinimo != null && Number.isFinite(estoqueMinimo)
      ? Number(estoqueMinimo)
      : null;
  const abaixo =
    minimo != null && Number.isFinite(saldo) && saldo < minimo;

  if (!abaixo) return null;

  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-700"
      title="Abaixo do estoque mínimo"
    >
      Abaixo do mínimo
    </span>
  );
}
