"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPut, apiDelete } from "@/lib/api/client";
import type { DespesaInput } from "@/lib/schemas/despesa";

export function useCreateDespesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DespesaInput) =>
      apiPost<{ id: number }>("/api/v1/despesas", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
    },
  });
}

export function useUpdateDespesa(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DespesaInput>) => {
      if (!id) throw new Error("id required");
      return apiPut<{ id: number }>(`/api/v1/despesas/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
    },
  });
}

export function useDeleteDespesa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/despesas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
    },
  });
}
