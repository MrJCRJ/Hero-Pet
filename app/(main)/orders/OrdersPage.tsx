"use client";

import { PedidoListManager } from "@/components/pedidos/list";

/**
 * Página de gestão de Pedidos (compras e vendas).
 * Rota: /orders
 *
 * @see docs/MIGRATION_APP_ROUTER.md
 */
export function OrdersPage() {
  return <PedidoListManager limit={20} />;
}
