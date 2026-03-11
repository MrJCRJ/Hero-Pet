"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageSection } from "@/components/layout/PageSection";
import { ProductsManager } from "@/components/products";
import { EstoquePageClient } from "@/app/(main)/estoque/EstoquePageClient";

type TabValue = "cadastro" | "estoque";

export default function ProdutosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams?.get("tab") ?? null;
  const tab: TabValue =
    tabParam === "estoque" ? "estoque" : "cadastro";

  const setTab = (value: TabValue) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", value);
    router.replace(`/produtos?${params.toString()}`, { scroll: false });
  };

  return (
    <PageSection
      title="Produtos"
      description="Cadastro de produtos e gestão de estoque"
    >
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setTab("cadastro")}
            className={`px-4 py-2 text-sm font-medium rounded-t border border-b-0 transition-colors ${
              tab === "cadastro"
                ? "bg-[var(--color-bg-secondary)] border-[var(--color-border)] -mb-px"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Cadastro
          </button>
          <button
            type="button"
            onClick={() => setTab("estoque")}
            className={`px-4 py-2 text-sm font-medium rounded-t border border-b-0 transition-colors ${
              tab === "estoque"
                ? "bg-[var(--color-bg-secondary)] border-[var(--color-border)] -mb-px"
                : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Estoque
          </button>
        </div>
        {tab === "cadastro" && <ProductsManager />}
        {tab === "estoque" && <EstoquePageClient />}
      </div>
    </PageSection>
  );
}
