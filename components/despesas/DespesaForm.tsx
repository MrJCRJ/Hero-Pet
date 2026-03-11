import React, { useState, useEffect, ChangeEvent } from "react";
import { Button } from "components/ui/Button";
import type { Despesa, Entity } from "@/types";

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

export interface DespesaFormValues {
  descricao: string;
  categoria: string;
  valor: string | number;
  data_vencimento: string;
  data_pagamento: string;
  status: string;
  fornecedor_id: string | number;
  observacao: string;
  recorrente?: boolean;
  recorrencia_frequencia?: string;
  recorrencia_dia?: number | string;
  recorrencia_mes?: number | string;
}

/* eslint-disable no-unused-vars -- callback param names in interface */
interface DespesaFormProps {
  initial: Despesa | null;
  onSubmit: (data: DespesaFormValues) => void | Promise<void>;
  submitting: boolean;
  onCancel: () => void;
}
/* eslint-enable no-unused-vars */

export function DespesaForm({
  initial,
  onSubmit,
  submitting,
  onCancel,
}: DespesaFormProps) {
  const [fornecedores, setFornecedores] = useState<Entity[]>([]);
  const [form, setForm] = useState<DespesaFormValues>({
    descricao: "",
    categoria: "outros",
    valor: "",
    data_vencimento: "",
    data_pagamento: "",
    status: "pendente",
    fornecedor_id: "",
    observacao: "",
    recorrente: false,
    recorrencia_frequencia: "mensal",
    recorrencia_dia: 1,
    recorrencia_mes: 1,
  });

  useEffect(() => {
    if (initial) {
      const rec = initial as Despesa & { recorrente?: boolean; recorrencia_dia?: number; recorrencia_mes?: number };
      setForm({
        descricao: initial.descricao || "",
        categoria: initial.categoria || "outros",
        valor: initial.valor ?? "",
        data_vencimento: initial.data_vencimento || "",
        data_pagamento: initial.data_pagamento || "",
        status: initial.status || "pendente",
        fornecedor_id: initial.fornecedor_id ?? "",
        observacao: initial.observacao || "",
        recorrente: !!rec.recorrente,
        recorrencia_frequencia: (rec as { recorrencia_frequencia?: string }).recorrencia_frequencia || "mensal",
        recorrencia_dia: rec.recorrencia_dia ?? 1,
        recorrencia_mes: rec.recorrencia_mes ?? 1,
      });
    }
  }, [initial]);

  useEffect(() => {
    // Buscar fornecedores (entities do tipo PJ)
    fetch("/api/v1/entities?entity_type=PJ&ativo=true&limit=200")
      .then((res) => res.json())
      .then((result: { data?: Entity[] }) => {
        setFornecedores(result.data || []);
      })
      .catch((err) => console.error("Erro ao buscar fornecedores:", err));
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
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
          value={String(form.fornecedor_id)}
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

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="recorrente"
          name="recorrente"
          checked={!!form.recorrente}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, recorrente: e.target.checked }))
          }
          className="rounded border-[var(--color-border)]"
        />
        <label htmlFor="recorrente" className="text-sm font-medium">
          Despesa recorrente (gerar 12 meses)
        </label>
      </div>

      {form.recorrente && (
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 space-y-4">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Alterar o modelo não afeta lançamentos já gerados.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Frequência</label>
              <select
                name="recorrencia_frequencia"
                value={form.recorrencia_frequencia || "mensal"}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
              >
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dia do vencimento (1-31)</label>
              <input
                type="number"
                name="recorrencia_dia"
                value={form.recorrencia_dia ?? 1}
                onChange={handleChange}
                min={1}
                max={31}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
              />
            </div>
            {form.recorrencia_frequencia === "anual" && (
              <div>
                <label className="block text-sm font-medium mb-1">Mês (1-12)</label>
                <select
                  name="recorrencia_mes"
                  value={String(form.recorrencia_mes ?? 1)}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString("pt-BR", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

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
