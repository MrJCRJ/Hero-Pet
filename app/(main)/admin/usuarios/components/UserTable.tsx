"use client";

/* eslint-disable no-unused-vars -- param names in interface are for typing */
import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/entities/shared/toast";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  TABLE_CONTAINER_SCROLL,
  TABLE_BASE,
  THEAD_STICKY,
  THEAD_ROW,
  TH_BASE,
  ACTION_TH,
  ROW_HOVER,
} from "@/components/common/tableStyles";

export type UserRow = {
  id: number;
  nome: string;
  email: string;
  role: string;
  must_change_password: boolean;
  created_at?: string;
};

interface UserTableProps {
  onEdit: (user: UserRow) => void;
  refreshTrigger?: number;
}

export function UserTable({ onEdit, refreshTrigger }: UserTableProps) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const { push } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/users");
      if (!res.ok) throw new Error("Falha ao carregar usuários");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      push(
        e instanceof Error ? e.message : "Erro ao carregar usuários",
        { type: "error" }
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  async function handleDelete(id: number) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Falha ao excluir (${res.status})`);
      }
      push("Usuário excluído.");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      push(
        e instanceof Error ? e.message : "Erro ao excluir",
        { type: "error" }
      );
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    operador: "Operador",
    visualizador: "Visualizador",
  };

  if (loading) {
    return (
      <div className="rounded border p-6 text-center text-[var(--color-text-secondary)]">
        Carregando...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded border p-6 text-center text-[var(--color-text-secondary)]">
        Nenhum usuário cadastrado.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={TABLE_CONTAINER_SCROLL}>
        <table className={TABLE_BASE}>
          <thead className={THEAD_STICKY}>
            <tr className={THEAD_ROW}>
              <th className={TH_BASE}>Nome</th>
              <th className={TH_BASE}>Email</th>
              <th className={TH_BASE}>Role</th>
              <th className={TH_BASE}>Trocar senha</th>
              <th className={ACTION_TH}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={ROW_HOVER}>
                <td className="px-3 py-2 font-medium">{row.nome}</td>
                <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                  {row.email}
                </td>
                <td className="px-3 py-2">
                  {roleLabel[row.role] ?? row.role}
                </td>
                <td className="px-3 py-2">
                  {row.must_change_password ? "Sim" : "Não"}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(row);
                      }}
                      className="text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmId(row.id);
                      }}
                      disabled={deletingId !== null}
                      className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmId !== null && (
        <ConfirmDialog
          title="Excluir usuário"
          message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          danger
          loading={deletingId === confirmId}
          onConfirm={() => handleDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
