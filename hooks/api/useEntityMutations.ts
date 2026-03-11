"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPut } from "@/lib/api/client";

export interface EntityPayload {
  name: string;
  entity_type: "PF" | "PJ";
  document_digits?: string;
  document_pending?: boolean;
  cep?: string | null;
  telefone?: string | null;
  email?: string | null;
  numero?: string | null;
  complemento?: string | null;
  ativo?: boolean;
}

export function useCreateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EntityPayload) =>
      apiPost<{ id: number }>("/api/v1/entities", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useUpdateEntity(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EntityPayload) => {
      if (!id) throw new Error("id required");
      return apiPut<{ id: number }>(`/api/v1/entities/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["entities", id] });
      }
    },
  });
}
