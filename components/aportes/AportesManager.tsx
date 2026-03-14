"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "components/common/Modal";
import { ConfirmDialog } from "components/common/ConfirmDialog";
import { Button } from "components/ui/Button";
import { HandCoins, Trash2 } from "lucide-react";

export interface Aporte {
  id: number;
  data: string;
  valor: number;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

function formatBrl(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("pt-BR");
  } catch {
    return s;
  }
}

export function AportesManager() {
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Aporte | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [mes, setMes] = useState(0);
  const [ano, setAno] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    data: new Date().toISOString().slice(0, 10),
    valor: "",
    descricao: "",
  });

  const fetchAportes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (mes) params.set("mes", String(mes));
      if (ano) params.set("ano", String(ano));
      params.set("limit", "200");

      const response = await fetch(`/api/v1/aportes?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setAportes(result.data || []);
      } else {
        console.error("Erro ao buscar aportes");
      }
    } catch (error) {
      console.error("Erro ao buscar aportes:", error);
    } finally {
      setLoading(false);
    }
  }, [mes, ano]);

  useEffect(() => {
    fetchAportes();
  }, [fetchAportes]);

  const handleOpenNew = () => {
    setFormData({
      data: new Date().toISOString().slice(0, 10),
      valor: "",
      descricao: "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(formData.valor.replace(/,/g, "."));
    if (!formData.data || !valorNum || valorNum <= 0) {
      alert("Preencha data e valor válido.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/aportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: formData.data,
          valor: valorNum,
          descricao: formData.descricao.trim() || null,
        }),
      });

      if (response.ok) {
        handleCloseModal();
        fetchAportes();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao salvar aporte");
      }
    } catch (error) {
      console.error("Erro ao salvar aporte:", error);
      alert("Erro ao salvar aporte");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (aporte: Aporte) => {
    setDeleteTarget(aporte);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/v1/aportes/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteTarget(null);
        fetchAportes();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao excluir aporte");
      }
    } catch (error) {
      console.error("Erro ao excluir aporte:", error);
      alert("Erro ao excluir aporte");
    }
  };

  const total = aportes.reduce((s, a) => s + Number(a.valor), 0);

  const anos = Array.from(
    { length: 10 },
    (_, i) => new Date().getFullYear() - i
  );

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Aportes de capital
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Investimentos dos sócios que entram como entrada no Fluxo de Caixa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm"
          >
            <option value={0}>Todos os meses</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString("pt-BR", { month: "long" })}
              </option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm"
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <Button onClick={handleOpenNew} icon={HandCoins}>
            Novo aporte
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
          Carregando...
        </p>
      ) : (
        <>
          <p className="mb-3 font-medium">
            Total no período: {formatBrl(total)} ({aportes.length} registro(s))
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-2 text-left">Data</th>
                  <th className="py-2 text-left">Descrição</th>
                  <th className="py-2 text-right">Valor</th>
                  <th className="py-2 text-right w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {aportes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-[var(--color-text-secondary)]"
                    >
                      Nenhum aporte registrado. Clique em &quot;Novo aporte&quot; para
                      adicionar.
                    </td>
                  </tr>
                ) : (
                  aportes.map((aporte) => (
                    <tr
                      key={aporte.id}
                      className="border-b border-[var(--color-border)]"
                    >
                      <td className="py-2">{formatDate(aporte.data)}</td>
                      <td className="py-2">
                        {aporte.descricao || "—"}
                      </td>
                      <td className="py-2 text-right font-medium text-green-600 dark:text-green-400">
                        {formatBrl(Number(aporte.valor))}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(aporte)}
                          className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && (
        <Modal title="Novo aporte de capital" onClose={handleCloseModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Data *
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, data: e.target.value }))
                }
                required
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Valor (R$) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={formData.valor}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, valor: e.target.value }))
                }
                required
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Descrição (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Investimento dos sócios para compra de ração"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, descricao: e.target.value }))
                }
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" loading={submitting}>
                Salvar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir aporte"
          message={
            <>
              <p className="mb-2">
                Tem certeza que deseja excluir este aporte?
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {formatDate(deleteTarget.data)} —{" "}
                {deleteTarget.descricao || "Sem descrição"}
                <br />
                Valor: {formatBrl(Number(deleteTarget.valor))}
              </p>
            </>
          }
          confirmLabel="Sim, excluir"
          cancelLabel="Cancelar"
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
