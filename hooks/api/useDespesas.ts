"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import type { Despesa, DespesaFilters } from "@/types";

export type { Despesa, DespesaFilters };

interface DespesasResponse {
  data: Despesa[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

async function fetchDespesas(filters: DespesaFilters): Promise<DespesasResponse> {
  const params = new URLSearchParams();
  if (filters.categoria) params.set("categoria", filters.categoria);
  if (filters.status) params.set("status", filters.status);
  if (filters.mes) params.set("mes", String(filters.mes));
  if (filters.ano) params.set("ano", String(filters.ano));
  if (filters.fornecedor_id != null)
    params.set("fornecedor_id", String(filters.fornecedor_id));
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 50));

  const res = await apiGet<DespesasResponse>(
    `/api/v1/despesas?${params.toString()}`
  );
  return res as DespesasResponse;
}

export function useDespesas(filters: DespesaFilters) {
  return useQuery({
    queryKey: ["despesas", filters],
    queryFn: () => fetchDespesas(filters),
  });
}
