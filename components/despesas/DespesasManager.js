import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "components/common/Modal";
import { ConfirmDialog } from "components/common/ConfirmDialog";
import { Button } from "components/ui/Button";
import { DespesaForm } from "./DespesaForm";
import { DespesasFilters } from "./DespesasFilters";
import { DespesasTable } from "./DespesasTable";

export function DespesasManager() {
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filtros
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  const fetchDespesas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoria) params.set("categoria", categoria);
      if (status) params.set("status", status);
      if (mes) params.set("mes", mes.toString());
      if (ano) params.set("ano", ano.toString());
      params.set("limit", "100");

      const response = await fetch(`/api/v1/despesas?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setDespesas(result.data || []);
      } else {
        console.error("Erro ao buscar despesas");
      }
    } catch (error) {
      console.error("Erro ao buscar despesas:", error);
    } finally {
      setLoading(false);
    }
  }, [categoria, status, mes, ano]);

  useEffect(() => {
    fetchDespesas();
  }, [fetchDespesas]);

  const handleOpenNew = () => {
    setEditing(null);
    setShowModal(true);
  };

  const handleOpenEdit = (despesa) => {
    setEditing(despesa);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const url = editing
        ? `/api/v1/despesas/${editing.id}`
        : "/api/v1/despesas";
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        handleCloseModal();
        fetchDespesas();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao salvar despesa");
      }
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
      alert("Erro ao salvar despesa");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (despesa) => {
    setDeleteTarget(despesa);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/v1/despesas/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteTarget(null);
        fetchDespesas();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao excluir despesa");
      }
    } catch (error) {
      console.error("Erro ao excluir despesa:", error);
      alert("Erro ao excluir despesa");
    }
  };

  const handleMarcarPago = async (despesa) => {
    try {
      const response = await fetch(`/api/v1/despesas/${despesa.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pago",
          data_pagamento: new Date().toISOString().split("T")[0],
        }),
      });

      if (response.ok) {
        fetchDespesas();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao marcar como pago");
      }
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      alert("Erro ao marcar como pago");
    }
  };

  // Calcular totais
  const totais = despesas.reduce(
    (acc, d) => {
      const valor = parseFloat(d.valor) || 0;
      acc.total += valor;
      if (d.status === "pago") acc.pago += valor;
      if (d.status === "pendente") acc.pendente += valor;
      return acc;
    },
    { total: 0, pago: 0, pendente: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Despesas</h2>
        <Button onClick={handleOpenNew} variant="primary" fullWidth={false}>
          Adicionar Despesa
        </Button>
      </div>

      <DespesasFilters
        categoria={categoria}
        setCategoria={setCategoria}
        status={status}
        setStatus={setStatus}
        mes={mes}
        setMes={setMes}
        ano={ano}
        setAno={setAno}
      />

      {/* Cards de totais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-4">
          <div className="text-xs opacity-70">Total</div>
          <div className="text-xl font-bold">R$ {totais.total.toFixed(2)}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="text-xs opacity-70">Pago</div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            R$ {totais.pago.toFixed(2)}
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
          <div className="text-xs opacity-70">Pendente</div>
          <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
            R$ {totais.pendente.toFixed(2)}
          </div>
        </div>
      </div>

      <DespesasTable
        despesas={despesas}
        loading={loading}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteClick}
        onMarcarPago={handleMarcarPago}
      />

      {showModal && (
        <Modal
          onClose={handleCloseModal}
          title={editing ? "Editar Despesa" : "Nova Despesa"}
        >
          <DespesaForm
            initial={editing}
            onSubmit={handleSubmit}
            submitting={submitting}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir Despesa"
          message={
            <p className="text-sm">
              Tem certeza que deseja excluir a despesa{" "}
              <strong>{deleteTarget.descricao}</strong>?
            </p>
          }
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
