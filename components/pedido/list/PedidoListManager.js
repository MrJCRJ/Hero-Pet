import React, { useState, useCallback } from 'react';
import { Button } from 'components/ui/Button';
import { PedidoForm } from 'components/PedidoForm';
import { PedidoListBrowser } from './PedidoListBrowser';
import OrdersDashboard from 'components/orders/dashboard/OrdersDashboard';

export function PedidoListManager({ limit = 20 }) {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const bump = useCallback(() => setRefreshKey(k => k + 1), []);

  const handleEdit = async (row) => {
    try {
      const res = await fetch(`/api/v1/pedidos/${row.id}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Falha ao carregar pedido');
      setEditing(json);
      setShowForm(true);
    } catch (e) {
      console.error(e);
    }
  };

  if (!showForm) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-3">Pedidos</h2>
          <Button onClick={() => setShowForm(true)} variant="primary" fullWidth={false}>Adicionar</Button>
        </div>
        <OrdersDashboard />
        <PedidoListBrowser limit={limit} refreshTick={refreshKey} onEdit={handleEdit} />
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-lg p-7 max-w-[1024px] w-full mx-auto mt-4">
      <div className="max-w-full">
        <h2 className="text-xl font-bold mb-1 border-b border-[var(--color-border)] pb-2">Pedido</h2>
        <div className="max-w-full overflow-x-auto space-y-6 p-1.5">
          <PedidoForm
            editingOrder={editing}
            onCreated={() => { setShowForm(false); setEditing(null); bump(); }}
            onSaved={() => { setShowForm(false); setEditing(null); bump(); }}
          />
          <div className="flex justify-end mt-2">
            <Button variant="secondary" fullWidth={false} onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
