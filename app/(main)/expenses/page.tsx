"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redireciona /expenses para /financeiro?tab=despesas */
export default function ExpensesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/financeiro?tab=despesas");
  }, [router]);
  return (
    <p className="text-[var(--color-text-secondary)]">Redirecionando para Financeiro...</p>
  );
}
