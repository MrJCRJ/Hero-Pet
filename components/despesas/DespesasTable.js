import React from "react";

const CATEGORIA_LABELS = {
  aluguel: "Aluguel",
  energia: "Energia",
  agua: "Água",
  internet: "Internet",
  telefone: "Telefone",
  salarios: "Salários",
  tributos: "Tributos",
  marketing: "Marketing",
  manutencao: "Manutenção",
  transporte: "Transporte",
  alimentacao: "Alimentação",
  material_escritorio: "Material de Escritório",
  outros: "Outros",
};

const STATUS_COLORS = {
  pendente: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  pago: "text-green-600 bg-green-50 dark:bg-green-900/20",
  cancelado: "text-gray-600 bg-gray-50 dark:bg-gray-900/20",
};

export function DespesasTable({
  despesas,
  loading,
  onEdit,
  onDelete,
  onMarcarPago,
}) {
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value) => {
    return parseFloat(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div className="border border-[var(--color-border)] rounded-md overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
          <tr>
            <th className="p-3">Descrição</th>
            <th className="p-3">Categoria</th>
            <th className="p-3">Valor</th>
            <th className="p-3">Vencimento</th>
            <th className="p-3">Pagamento</th>
            <th className="p-3">Status</th>
            <th className="p-3">Fornecedor</th>
            <th className="p-3 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {despesas.map((despesa) => (
            <tr
              key={despesa.id}
              className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
            >
              <td className="p-3">
                <div className="font-medium">{despesa.descricao}</div>
                {despesa.observacao && (
                  <div className="text-xs opacity-70 mt-1">
                    {despesa.observacao}
                  </div>
                )}
              </td>
              <td className="p-3">
                <span className="text-xs px-2 py-1 rounded bg-[var(--color-bg-secondary)]">
                  {CATEGORIA_LABELS[despesa.categoria] || despesa.categoria}
                </span>
              </td>
              <td className="p-3 font-semibold">
                {formatCurrency(despesa.valor)}
              </td>
              <td className="p-3">{formatDate(despesa.data_vencimento)}</td>
              <td className="p-3">
                {despesa.data_pagamento
                  ? formatDate(despesa.data_pagamento)
                  : "-"}
              </td>
              <td className="p-3">
                <span
                  className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[despesa.status] || ""}`}
                >
                  {despesa.status}
                </span>
              </td>
              <td className="p-3 text-xs opacity-70">
                {despesa.fornecedor_name || "-"}
              </td>
              <td className="p-3">
                <div className="flex gap-1 justify-center">
                  {despesa.status === "pendente" && (
                    <button
                      onClick={() => onMarcarPago(despesa)}
                      className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/40"
                      title="Marcar como pago"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(despesa)}
                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/40"
                    title="Editar"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onDelete(despesa)}
                    className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/40"
                    title="Excluir"
                  >
                    ✕
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!despesas.length && (
            <tr>
              <td colSpan={8} className="p-8 text-center opacity-70">
                {loading ? "Carregando..." : "Nenhuma despesa encontrada"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
