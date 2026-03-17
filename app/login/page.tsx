"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";
  const errorParam = searchParams?.get("error");
  const messageParam = searchParams?.get("message");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError("Email ou senha incorretos. Tente novamente.");
        setLoading(false);
        return;
      }
      if (result?.ok) {
        window.location.href = callbackUrl;
        return;
      }
    } catch {
      setError("Erro ao realizar login. Tente novamente.");
    }
    setLoading(false);
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
            Acesso ao Sistema
          </h2>
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
            Entre com seu email e senha:
          </p>
          {errorParam === "role_missing" && (
            <p className="mb-4 px-3 py-2 text-sm rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
              Suas permissões precisam ser atualizadas. Faça login novamente para acessar a área administrativa.
            </p>
          )}
          {messageParam === "senha_alterada" && (
            <p className="mb-4 px-3 py-2 text-sm rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">
              Senha alterada com sucesso. Faça login com sua nova senha.
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              required
              aria-label="Email"
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-shadow"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              autoComplete="current-password"
              required
              aria-label="Senha"
              className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-shadow"
            />
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
