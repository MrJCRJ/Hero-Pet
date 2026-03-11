"use client";

import React, { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useStatus } from "@/hooks/useStatus";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusNav } from "@/components/layout/StatusNav";
import { MainNav } from "@/components/layout/MainNav";
import { EntitiesManager } from "@/components/entities";

/**
 * Página inicial (rota /).
 * Middleware garante que apenas usuários logados chegam aqui.
 */
export function HomePage() {
  const { status, loading } = useStatus();
  const { data: session } = useSession();
  const user = session?.user;

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash && hash.includes("tab=")) {
      const params = new URLSearchParams(hash.slice(1));
      const tab = params.get("tab");
      const routes: Record<string, string> = {
        entities: "/entities",
        products: "/products",
        orders: "/orders",
        expenses: "/financeiro?tab=despesas",
      };
      if (tab && routes[tab]) {
        window.location.href = routes[tab];
      }
    }
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors">
        <h1 className="text-sm">Carregando...</h1>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen text-sm transition-colors">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-lg font-bold text-center">Sistema Hero-Pet</h1>
        <StatusNav status={status} compact />
        <div className="flex items-center gap-4">
          <AdminHeader
            onLogout={() => signOut({ callbackUrl: "/login" })}
            user={user ? { name: user.name ?? "Usuário" } : { name: "Usuário" }}
          />
        </div>
      </div>
      <MainNav />
      <div className="mb-8">
        <EntitiesManager browserLimit={20} />
      </div>
    </div>
  );
}
