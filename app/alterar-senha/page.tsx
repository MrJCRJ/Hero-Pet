"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
export default function AlterarSenhaPage() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (novaSenha !== confirmar) {
      setError("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (novaSenha.length < 8) {
      setError("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senha_atual: senhaAtual,
          nova_senha: novaSenha,
          confirmar,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Erro ao alterar senha.");
        setLoading(false);
        return;
      }
      await signOut({ redirect: false });
      router.replace("/login?message=senha_alterada");
    } catch {
      setError("Erro ao conectar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8 transition-colors">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Hero-Pet
          </h1>
        </div>
        <div className="card p-6 max-w-sm mx-auto text-center">
          <h2 className="text-lg font-semibold mb-2 text-[var(--color-text-primary)]">
            Alterar senha
          </h2>
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
            Por segurança, defina uma nova senha para continuar.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="Senha atual"
              required
              autoComplete="current-password"
              aria-label="Senha atual"
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-shadow"
            />
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Nova senha (mín. 8 caracteres)"
              required
              minLength={8}
              autoComplete="new-password"
              aria-label="Nova senha"
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-shadow"
            />
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Confirmar nova senha"
              required
              minLength={8}
              autoComplete="new-password"
              aria-label="Confirmar nova senha"
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-shadow"
            />
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Alterando..." : "Alterar senha"}
            </Button>
          </form>
          {error && (
            <p className="text-red-500 mt-3 text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
