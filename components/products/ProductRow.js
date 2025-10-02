import React from "react";
import { ROW_HOVER, ACTION_BTN_HIDDEN } from "components/common/tableStyles";
import { formatBRL, formatQtyBR } from "components/common/format";

function PrecoCell({ p, costMap }) {
  const cm = costMap[p.id]?.custo_medio ?? null;
  const uc = costMap[p.id]?.ultimo_custo ?? null;
  const vendaTabela = p.preco_tabela != null ? Number(p.preco_tabela) : null;
  let venda = vendaTabela;
  if (!(Number.isFinite(venda) && venda > 0)) {
    const base =
      Number.isFinite(cm) && cm > 0
        ? cm
        : Number.isFinite(uc) && uc > 0
          ? uc
          : null;
    let mk = Number(p.markup_percent_default);
    if (!Number.isFinite(mk) || mk <= 0) mk = 30;
    venda = base == null ? null : Number((base * (1 + mk / 100)).toFixed(2));
  }
  return (
    <div className="text-xs">
      <div
        className="flex items-center justify-between"
        title="Média ponderada de compras"
      >
        <span className="opacity-70">Compra</span>
        <span>{Number.isFinite(cm) && cm > 0 ? formatBRL(cm) : "-"}</span>
      </div>
      <div
        className="flex items-center justify-between mt-0.5"
        title="Preço de venda (tabela ou custo×markup)"
      >
        <span className="opacity-70">Venda</span>
        <span>
          {Number.isFinite(venda) && venda > 0 ? formatBRL(venda) : "-"}
        </span>
      </div>
    </div>
  );
}

function EstoqueCell({ p, costMap }) {
  const saldo = costMap[p.id]?.saldo;
  const minConfigured =
    p.estoque_minimo != null ? Number(p.estoque_minimo) : null;
  const minHint = costMap[p.id]?.min_hint ?? null;
  const minimo = minConfigured != null ? minConfigured : minHint;
  const below =
    Number.isFinite(saldo) && Number.isFinite(minimo) && saldo < minimo;
  return (
    <div className="text-xs">
      <div
        className="flex items-center justify-between"
        title="Estoque atual do produto"
      >
        <span className="opacity-70">Atual</span>
        <span
          className={below ? "text-red-500 font-medium" : ""}
          title={below ? "Abaixo do estoque mínimo" : undefined}
        >
          {Number.isFinite(saldo) ? formatQtyBR(saldo) : "-"}
        </span>
      </div>
      <div
        className="flex items-center justify-between mt-0.5"
        title={
          minConfigured != null
            ? "Estoque mínimo cadastrado"
            : "Estoque mínimo sugerido (30 dias de consumo)"
        }
      >
        <span className="opacity-70">Mínimo</span>
        <span>{Number.isFinite(minimo) ? minimo.toFixed(0) : "-"}</span>
      </div>
    </div>
  );
}

export default function ProductRow({
  p,
  costMap,
  onEdit,
  onInactivate,
  onReactivate,
  onHardDelete,
}) {
  return (
    <tr
      className={`${ROW_HOVER} border-[var(--color-border)]`}
      onClick={() => onEdit && onEdit(p)}
      title="Clique na linha para editar"
      tabIndex={0}
    >
      <td className="p-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${p.ativo ? "bg-green-500" : "bg-red-500"}`}
            title={p.ativo ? "Ativo" : "Inativo"}
          />
          <span>{p.nome}</span>
        </div>
      </td>
      <td className="p-2">{p.categoria || "-"}</td>
      <td className="p-2 text-xs align-top w-[160px] max-w-[160px]">
        <div
          className="max-w-[160px] truncate whitespace-nowrap"
          title={
            Array.isArray(p.supplier_labels) && p.supplier_labels.length
              ? p.supplier_labels
                  .map((s) => s.name || s.label || `#${s.id}`)
                  .join(", ")
              : "-"
          }
        >
          {Array.isArray(p.supplier_labels) && p.supplier_labels.length
            ? (() => {
                const names = p.supplier_labels.map(
                  (s) => s.name || s.label || `#${s.id}`,
                );
                const shown = names.slice(0, 2).join(", ");
                const extra = names.length - 2;
                if (extra > 0)
                  return (
                    <span>
                      {shown} +{extra}
                    </span>
                  );
                return <span>{shown}</span>;
              })()
            : "-"}
        </div>
      </td>
      <td className="p-2">
        <PrecoCell p={p} costMap={costMap} />
      </td>
      <td className="p-2">
        <EstoqueCell p={p} costMap={costMap} />
      </td>
      <td className="p-2">
        <div className="flex items-center gap-2">
          {p.ativo ? (
            <button
              className={`h-7 w-7 flex items-center justify-center rounded border border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:ring-2 hover:ring-[var(--color-border)] hover:shadow-sm ${ACTION_BTN_HIDDEN}`}
              title="Inativar"
              aria-label="Inativar"
              onClick={(e) => {
                e.stopPropagation();
                onInactivate && onInactivate(p);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-12.536a6 6 0 00-8.485 8.485l8.485-8.485zm1.414 1.414l-8.485 8.485a6 6 0 008.485-8.485z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : (
            <button
              className={`h-7 w-7 flex items-center justify-center rounded border border-[var(--color-border)] hover:bg-[var(--color-bg)] hover:ring-2 hover:ring-[var(--color-border)] hover:shadow-sm ${ACTION_BTN_HIDDEN}`}
              title="Reativar"
              aria-label="Reativar"
              onClick={(e) => {
                e.stopPropagation();
                onReactivate && onReactivate(p);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 10a3 3 0 116 0 3 3 0 01-6 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          {/* Botão de exclusão definitiva */}
          <button
            className={`h-7 w-7 flex items-center justify-center rounded border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 hover:ring-2 hover:ring-red-400/40 ${ACTION_BTN_HIDDEN}`}
            title="Excluir definitivamente"
            aria-label="Excluir definitivamente"
            onClick={(e) => {
              e.stopPropagation();
              onHardDelete && onHardDelete(p);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 3h6m-9 4h12m-10 3v7m4-7v7M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"
              />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
