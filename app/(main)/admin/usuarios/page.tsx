"use client";

import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageSection } from "@/components/layout/PageSection";
import { UserTable } from "./components/UserTable";
import { UserFormDialog } from "./components/UserFormDialog";

export default function AdminUsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formOpen, setFormOpen] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [editingUser, setEditingUser] = React.useState<{
    id: number;
    nome: string;
    email: string;
    role: string;
    must_change_password: boolean;
  } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      router.replace("/entities");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <PageSection title="Usuários" description="Carregando...">
        <div className="text-sm text-[var(--color-text-secondary)]">Carregando...</div>
      </PageSection>
    );
  }

  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return null;
  }

  return (
    <PageSection
      title="Usuários"
      description="Gerencie os usuários do sistema (apenas admin)"
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setEditingUser(null);
              setFormOpen(true);
            }}
            className="px-4 py-2 text-sm font-medium rounded border border-[var(--color-accent)] bg-[var(--color-accent)] text-white hover:opacity-90"
          >
            Novo usuário
          </button>
        </div>
        <UserTable
          onEdit={(u) => {
            setEditingUser(u);
            setFormOpen(true);
          }}
          refreshTrigger={refreshTrigger}
        />
      </div>
      {formOpen && (
        <UserFormDialog
          user={editingUser}
          onClose={() => {
            setFormOpen(false);
            setEditingUser(null);
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditingUser(null);
            setRefreshTrigger((t) => t + 1);
          }}
        />
      )}
    </PageSection>
  );
}
