"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { TopProdutosRanking } from "@/components/products/TopProdutosRanking";

export interface TopLucroViewProps {
  data: {
    top?: Array<Record<string, unknown>>;
    history?: Array<Record<string, unknown>>;
    meta?: Record<string, unknown>;
  } | null;
  mes: number;
  ano: number;
}

export function TopLucroView({ data }: TopLucroViewProps) {
  const router = useRouter();

  const handleNavigate = React.useCallback(
    (produtoId: number) => {
      router.push(`/produtos?tab=cadastro&q=%23${produtoId}`);
    },
    [router]
  );

  if (!data) {
    return <div className="text-sm text-[var(--color-text-secondary)]">Sem dados.</div>;
  }

  return (
    <TopProdutosRanking
      data={data}
      onNavigate={handleNavigate}
      showHistory
    />
  );
}
