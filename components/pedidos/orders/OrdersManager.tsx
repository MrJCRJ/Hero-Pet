import React, { useEffect, useState, useCallback } from "react";
import { useHighlightEntityLoad } from "hooks/useHighlightEntityLoad";
import { Button } from "../../ui/Button";
import { PedidoForm } from "../../PedidoForm";
import OrdersDashboard from "./dashboard/OrdersDashboard";
import { OrdersBrowser } from "./index";

interface OrdersManagerProps {
  limit?: number;
  refreshTick?: number;
}

export function OrdersManager({ limit = 20, refreshTick = 0 }: OrdersManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [internalRefresh, setInternalRefresh] = useState(0);
  const refreshKey = (refreshTick ?? 0) + internalRefresh;
  const [editing, setEditing] = useState(null);
  const bump = useCallback(() => setInternalRefresh((k) => k + 1), []);

  const highlightId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("highlight")
      : null;

  const { highlighted, loadingHighlight, clearHighlight } =
    useHighlightEntityLoad({
      highlightId,
      fetcher: async (id) => {
        const res = await fetch(`/api/v1/pedidos/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Falha ao carregar pedido");
        return json;
      },
    });

  useEffect(() => {
    if (highlighted) {
      setEditing(highlighted);
      setShowForm(true);
      try {
        if (typeof window !== "undefined" && window.history?.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.delete("highlight");
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (_) {
        /* noop */
      }
    }
  }, [highlighted]);

  const handleEdit = async (row) => {
    try {
      const res = await fetch(`/api/v1/pedidos/${row.id}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar pedido");
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
          <h2 className="text-lg font-semibold flex items-center gap-3">
            Pedidos
          </h2>
          <Button
            onClick={() => setShowForm(true)}
            variant="primary"
            fullWidth={false}
          >
            Adicionar
          </Button>
        </div>
        <OrdersDashboard />
        <OrdersBrowser
          limit={limit}
          refreshTick={refreshKey}
          onEdit={handleEdit}
        />
        {loadingHighlight && highlightId && (
          <div className="text-xs opacity-70">
            Carregando pedido #{highlightId}…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-lg p-7 max-w-[1024px] w-full mx-auto mt-4">
      <div className="max-w-full">
        <h2 className="text-xl font-bold mb-1 border-b border-[var(--color-border)] pb-2">
          Pedido
        </h2>
        <div className="max-w-full overflow-x-auto space-y-6 p-1.5">
          <PedidoForm
            editingOrder={editing}
            onCreated={() => {
              setShowForm(false);
              setEditing(null);
              clearHighlight();
              bump();
            }}
            onSaved={() => {
              setShowForm(false);
              setEditing(null);
              clearHighlight();
              bump();
            }}
          />
          <div className="flex justify-end mt-2">
            <Button
              variant="secondary"
              fullWidth={false}
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
