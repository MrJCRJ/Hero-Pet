import React from "react";

const CATEGORIAS = [
  { value: "", label: "Todas as categorias" },
  { value: "aluguel", label: "Aluguel" },
  { value: "energia", label: "Energia" },
  { value: "agua", label: "Água" },
  { value: "internet", label: "Internet" },
  { value: "telefone", label: "Telefone" },
  { value: "salarios", label: "Salários" },
  { value: "tributos", label: "Tributos" },
  { value: "marketing", label: "Marketing" },
  { value: "manutencao", label: "Manutenção" },
  { value: "transporte", label: "Transporte" },
  { value: "alimentacao", label: "Alimentação" },
  { value: "material_escritorio", label: "Material de Escritório" },
  { value: "outros", label: "Outros" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
];

export function DespesasFilters({
  categoria,
  setCategoria,
  status,
  setStatus,
  mes,
  setMes,
  ano,
  setAno,
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Categoria</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
          >
            {CATEGORIAS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Mês</label>
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Ano</label>
          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
