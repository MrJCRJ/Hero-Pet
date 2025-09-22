import React, { useState } from "react";
import { OrdersManager } from ".";
import { PedidoForm } from "../PedidoForm";

export function OrdersPage() {
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold mb-2">Pedidos</h2>
        <OrdersManager limit={20} refreshTick={tick} />
      </div>
      <div>
        <h2 className="font-semibold mb-2">Novo Pedido</h2>
        <PedidoForm onCreated={bump} />
      </div>
    </div>
  );
}
