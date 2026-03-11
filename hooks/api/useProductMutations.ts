"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPut, apiDelete } from "@/lib/api/client";
import type { ProductInput } from "@/lib/schemas/product";

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductInput) =>
      apiPost<{ id: number }>("/api/v1/produtos", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ProductInput> & Record<string, unknown>) => {
      if (!id) throw new Error("id required");
      return apiPut<{ id: number }>(`/api/v1/produtos/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["products", id] });
      }
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/api/v1/produtos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
