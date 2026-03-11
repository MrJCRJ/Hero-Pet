"use client";

import React, { useState } from "react";
import { Button } from "components/ui/Button";
import type { SaldoRow } from "./EstoqueSaldosTable";

interface MovimentacaoModalProps {
  produto: SaldoRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

type TipoMov = "ENTRADA" | "SAIDA" | "AJUSTE";

const schema = {
  tipo: (v: string) =>
    ["ENTRADA", "SAIDA", "AJUSTE"].includes(v) ? null : "Tipo inválido",
  quantidade: (v: number) =>
    Number.isFinite(v) && v > 0 ? null : "Quantidade deve ser maior que 0",
  valor_unitario: (v: number, tipo: string) =>
    tipo === "ENTRADA"
      ? Number.isFinite(v) && v >= 0
        ? null
        : "Valor unitário obrigatório para entrada"
      : null,
};

export function MovimentacaoModal({
  produto,
  onClose,
  onSuccess,
}: MovimentacaoModalProps) {
  const [tipo, setTipo] = useState<TipoMov>("ENTRADA");
  const [quantidade, setQuantidade] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");
  const [documento, setDocumento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!produto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qtd = parseFloat(quantidade.replace(",", "."));
    const valor = parseFloat(valorUnitario.replace(",", "."));

    const errTipo = schema.tipo(tipo);
    const errQtd = schema.quantidade(qtd);
    const errValor = schema.valor_unitario(valor, tipo);

    if (errTipo || errQtd || (tipo === "ENTRADA" && errValor)) {
      setError(errTipo || errQtd || errValor || "Preencha os campos corretamente.");
      return;
    }

    const body: Record<string, unknown> = {
      produto_id: produto.produto_id,
      tipo,
      quantidade: Math.abs(qtd),
      documento: documento || null,
      observacao: observacao || null,
    };
    if (tipo === "ENTRADA") {
      body.valor_unitario = valor;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/estoque/movimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || "Erro ao criar movimentação.");
        return;
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal
      aria-labelledby="movimentacao-title"
    >
      <div className="mx-4 w-full max-w-md rounded-lg bg-[var(--color-bg-primary)] shadow-xl">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 id="movimentacao-title" className="text-lg font-semibold">
            Movimentar estoque — {produto.nome}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoMov)}
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm"
            >
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantidade</label>
            <input
              type="text"
              inputMode="decimal"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="Ex: 10"
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm"
              required
            />
          </div>

          {tipo === "ENTRADA" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Valor unitário (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
                placeholder="Ex: 25,90"
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Documento</label>
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Observação</label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              fullWidth={false}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} fullWidth={false}>
              Confirmar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
