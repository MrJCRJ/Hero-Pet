"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
export default function SetupPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/v1/setup")
      .then((r) => r.json())
      .then((data) => {
        if (!data.setupNeeded) {
          router.replace("/login");
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (senha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }
    if (senha.length < 8) {
      setError("Senha deve ter no mínimo 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          senha,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao criar administrador.");
        setLoading(false);
        return;
      }
      router.replace("/login");
    } catch {
      setError("Erro ao conectar. Tente novamente.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-[var(--color-text-secondary)]">Carregando...</span>
      </div>
    );
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
            Configuração inicial
          </h2>
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
            Crie o primeiro usuário administrador:
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome"
              required
              minLength={2}
              aria-label="Nome"
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-shadow"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              aria-label="Email"
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-shadow"
            />
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha (mín. 8 caracteres)"
              required
              minLength={8}
              aria-label="Senha"
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-shadow"
            />
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Confirmar senha"
              required
              aria-label="Confirmar senha"
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-shadow"
            />
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Criando..." : "Criar administrador"}
            </Button>
          </form>
          {error && <p className="text-red-500 mt-3 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}
