"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import type { Entity, EntityFilters } from "@/types";

export type { Entity, EntityFilters };

interface EntitiesResponse {
  data: Entity[];
  total?: number;
}

async function fetchEntities(filters: EntityFilters): Promise<{
  data: Entity[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.entity_type) params.set("entity_type", filters.entity_type);
  if (filters.q) params.set("q", filters.q);
  if (filters.address_fill) params.set("address_fill", filters.address_fill);
  if (filters.contact_fill) params.set("contact_fill", filters.contact_fill);
  params.set("meta", "1");
  params.set("limit", String(filters.limit ?? 100));
  params.set("offset", String(filters.offset ?? 0));

  const res = await apiGet<EntitiesResponse | Entity[]>(
    `/api/v1/entities?${params.toString()}`
  );

  if (Array.isArray(res)) {
    return { data: res, total: res.length };
  }
  return {
    data: (res as EntitiesResponse).data || [],
    total: (res as EntitiesResponse).total ?? 0,
  };
}

export function useEntities(filters: EntityFilters) {
  return useQuery({
    queryKey: ["entities", filters],
    queryFn: () => fetchEntities(filters),
  });
}
