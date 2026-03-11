"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import type { Order, OrderFilters } from "@/types";

export type { Order, OrderFilters };

interface OrdersResponse {
  data?: Order[];
  meta?: { total: number };
}

async function fetchOrders(filters: OrderFilters): Promise<{
  data: Order[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (filters.tipo) params.set("tipo", filters.tipo);
  if (filters.q) params.set("q", filters.q);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("limit", String(filters.limit ?? 20));
  params.set("offset", String(filters.offset ?? 0));
  params.set("meta", "1");

  const res = await apiGet<Order[] | OrdersResponse>(
    `/api/v1/pedidos?${params.toString()}`
  );

  if (Array.isArray(res)) {
    return { data: res, total: res.length };
  }
  const typed = res as OrdersResponse;
  return {
    data: typed.data ?? [],
    total: typed.meta?.total ?? 0,
  };
}

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () => fetchOrders(filters),
  });
}
