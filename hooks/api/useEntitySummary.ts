"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";

export function useEntitySummary() {
  return useQuery({
    queryKey: ["entities", "summary"],
    queryFn: () => apiGet<Record<string, unknown>>("/api/v1/entities/summary"),
  });
}
