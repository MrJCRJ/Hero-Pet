"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { FormField } from "@/components/ui/Form";
import { useToast } from "@/components/entities/shared/toast";
import type { UserRow } from "./UserTable";

interface UserFormDialogProps {
  user: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserFormDialog({
  user,
  onClose,
  onSaved,
}: UserFormDialogProps) {
  const { push } = useToast();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState("operador");
  const [must_change_password, setMustChangePassword] = useState(true);
  const [loading, setLoading] = useState(false);

  const isEdit = !!user?.id;

  useEffect(() => {
    if (user) {
      setNome(user.nome);
      setEmail(user.email);
      setSenha("");
      setRole(user.role);
      setMustChangePassword(user.must_change_password);
    } else {
      setNome("");
      setEmail("");
      setSenha("");
      setRole("operador");
      setMustChangePassword(true);
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      push("Preencha nome e email.", { type: "warn" });
      return;
    }
    if (!isEdit && (!senha || senha.length < 8)) {
      push("Senha deve ter no mínimo 8 caracteres.", { type: "warn" });
      return;
    }
    if (isEdit && senha && senha.length < 8) {
      push("Senha deve ter no mínimo 8 caracteres (ou deixe em branco).", {
        type: "warn",
      });
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        role,
        must_change_password: must_change_password,
      };
      if (senha.trim()) body.senha = senha.trim();

      const url = isEdit ? `/api/v1/users/${user.id}` : "/api/v1/users";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Erro (${res.status})`);
      }

      push(isEdit ? "Usuário atualizado." : "Usuário criado.");
      onSaved();
    } catch (e) {
      push(
        e instanceof Error ? e.message : "Erro ao salvar",
        { type: "error" }
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Editar usuário" : "Novo usuário"}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Nome"
          name="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isEdit}
        />
        <FormField
          label={isEdit ? "Nova senha (deixe em branco para não alterar)" : "Senha"}
          name="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required={!isEdit}
        />
        <div>
          <label
            htmlFor="role"
            className="block text-sm text-[var(--color-text-secondary)] mb-1"
          >
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="block w-full py-2 px-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm"
          >
            <option value="admin">Admin</option>
            <option value="operador">Operador</option>
            <option value="visualizador">Visualizador</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={must_change_password}
            onChange={(e) => setMustChangePassword(e.target.checked)}
          />
          Exigir troca de senha no próximo login
        </label>
        <div className="flex gap-2 pt-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 text-sm font-semibold rounded bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
