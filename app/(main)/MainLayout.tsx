"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { useStatus } from "@/hooks/useStatus";
import { useSession } from "next-auth/react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusNav } from "@/components/layout/StatusNav";
import { MainNav } from "@/components/layout/MainNav";
import { LoadingSkeleton } from "@/components/layout/LoadingSkeleton";
/**
 * Shell principal para rotas autenticadas.
 * Middleware garante que apenas usuários logados chegam aqui.
 */
export function MainLayout({ children }: { children: React.ReactNode }) {
  const { status, loading } = useStatus();
  const { data: session } = useSession();
  const user = session?.user;

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen transition-colors">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
              Sistema Hero-Pet
            </h1>
            <StatusNav status={status} compact />
          </div>
          <div className="flex items-center gap-3">
            <AdminHeader
              onLogout={() => signOut({ callbackUrl: "/login" })}
              user={user ? { name: user.name ?? "Usuário" } : { name: "Usuário" }}
            />
          </div>
        </header>

        {/* Navegação principal */}
        <MainNav />

        {/* Conteúdo da página */}
        <main className="mt-8" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
