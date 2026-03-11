"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import type { Product, ProductFilters } from "@/types";

export type { Product, ProductFilters };

interface ProductsResponse {
  data?: Product[];
  meta?: { total: number };
}

async function fetchProducts(filters: ProductFilters): Promise<{
  data: Product[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.categoria) params.set("categoria", filters.categoria);
  if (filters.ativo !== undefined && filters.ativo !== "")
    params.set("ativo", filters.ativo);
  params.set("limit", String(filters.limit ?? 100));
  if (filters.offset) params.set("offset", String(filters.offset));
  params.set("meta", "1");
  if (filters.fields) params.set("fields", filters.fields);
  if (filters.supplier_id != null)
    params.set("supplier_id", String(filters.supplier_id));

  const res = await apiGet<Product[] | ProductsResponse>(
    `/api/v1/produtos?${params.toString()}`
  );

  if (Array.isArray(res)) {
    return { data: res, total: res.length };
  }
  const typed = res as ProductsResponse;
  return {
    data: typed.data ?? [],
    total: typed.meta?.total ?? 0,
  };
}

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
  });
}
