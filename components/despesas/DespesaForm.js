import React, { useState, useEffect } from "react";
import { Button } from "components/ui/Button";

const CATEGORIAS = [
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
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
];

export function DespesaForm({ initial, onSubmit, submitting, onCancel }) {
  const [fornecedores, setFornecedores] = useState([]);
  const [form, setForm] = useState({
    descricao: "",
    categoria: "outros",
    valor: "",
    data_vencimento: "",
    data_pagamento: "",
    status: "pendente",
    fornecedor_id: "",
    observacao: "",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        descricao: initial.descricao || "",
        categoria: initial.categoria || "outros",
        valor: initial.valor || "",
        data_vencimento: initial.data_vencimento || "",
        data_pagamento: initial.data_pagamento || "",
        status: initial.status || "pendente",
        fornecedor_id: initial.fornecedor_id || "",
        observacao: initial.observacao || "",
      });
    }
  }, [initial]);

  useEffect(() => {
    // Buscar fornecedores (entities do tipo PJ)
    fetch("/api/v1/entities?entity_type=PJ&ativo=true&limit=200")
      .then((res) => res.json())
      .then((result) => {
        setFornecedores(result.data || []);
      })
      .catch((err) => console.error("Erro ao buscar fornecedores:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Descrição <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="descricao"
          value={form.descricao}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Categoria <span className="text-red-500">*</span>
          </label>
          <select
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
          >
            {CATEGORIAS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Valor (R$) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="valor"
            value={form.valor}
            onChange={handleChange}
            required
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Data Vencimento <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="data_vencimento"
            value={form.data_vencimento}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {form.status === "pago" && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Data Pagamento
          </label>
          <input
            type="date"
            name="data_pagamento"
            value={form.data_pagamento}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Fornecedor</label>
        <select
          name="fornecedor_id"
          value={form.fornecedor_id}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
        >
          <option value="">Selecione um fornecedor</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Observação</label>
        <textarea
          name="observacao"
          value={form.observacao}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          fullWidth={false}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="primary" fullWidth={false}>
          {submitting ? "Salvando..." : initial ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}
