"use client";

import { EntitiesManager } from "@/components/entities";

/**
 * Página de gestão de Entidades (clientes e fornecedores).
 * Rota: /entities
 */
export function EntitiesPage() {
  return <EntitiesManager browserLimit={20} />;
}
