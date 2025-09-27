import React, { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "../ui/Button";
import { PedidoForm } from "../PedidoForm";
import { useToast } from "../entities/shared/toast";
import { deleteOrder as deleteOrderService } from "../pedido/service";
import FilterBar from "./FilterBar";
import { usePedidos } from "./hooks";
import OrdersRow from "./OrdersRow";
import OrdersHeader from "./OrdersHeader";
import OrdersDashboard from "./OrdersDashboard";

// Formatação movida para components/common/date

// FilterBar extraído para ./FilterBar

// usePedidos extraído para ./hooks

const ORDERS_FILTERS_STORAGE_KEY = "orders.filters.v1";
const DEFAULT_ORDER_FILTERS = { tipo: "", q: "", from: "", to: "" };

export function OrdersBrowser({ limit = 20, refreshTick = 0, onEdit }) {
  const [filters, setFilters] = useState(DEFAULT_ORDER_FILTERS);
  const { loading, data, reload } = usePedidos(filters, limit);
  const { push } = useToast();
  useEffect(() => {
    // quando refreshTick muda, recarrega
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  // Carregar filtros iniciais (1x): PRIORIDADE URL -> depois localStorage
  const loadedFiltersRef = useRef(false);
  useEffect(() => {
    if (loadedFiltersRef.current) return;
    loadedFiltersRef.current = true;
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      const fromUrl = {};
      ["tipo", "q", "from", "to"].forEach((k) => {
        const val = url.searchParams.get(k);
        if (val) fromUrl[k] = val;
      });
      let fromStorage = {};
      const raw = window.localStorage.getItem(ORDERS_FILTERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") fromStorage = parsed;
      }
      // URL tem prioridade: merge ordem -> defaults -> storage -> url
      const initial = {
        ...DEFAULT_ORDER_FILTERS,
        ...fromStorage,
        ...fromUrl,
      };
      setFilters(initial);
    } catch (e) {
      // silencioso
      console.warn("Falha ao carregar filtros persistidos", e);
    }
  }, []);

  // Persistir filtros (debounced) e atualizar URL
  const debounceRef = useRef();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          ORDERS_FILTERS_STORAGE_KEY,
          JSON.stringify(filters),
        );
      } catch (e) {
        // silencioso
      }
      try {
        const url = new URL(window.location.href);
        ["tipo", "q", "from", "to"].forEach((k) => url.searchParams.delete(k));
        Object.entries(filters).forEach(([k, v]) => {
          if (v) url.searchParams.set(k, v);
        });
        window.history.replaceState({}, "", url.toString());
      } catch (e) {
        // ignore
      }
    }, 300); // 300ms debounce
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters]);

  // Permite que o Dashboard/Modais ajustem os filtros da lista
  const externalReloadPending = useRef(false);
  useEffect(() => {
    const onSetFilters = (e) => {
      const detail = e?.detail || {};
      externalReloadPending.current = true;
      setFilters((prev) => ({ ...prev, ...detail }));
    };
    window.addEventListener("orders:set-filters", onSetFilters);
    return () => window.removeEventListener("orders:set-filters", onSetFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Após filtros mudarem via evento externo, dispara reload automaticamente 1x
  useEffect(() => {
    if (externalReloadPending.current) {
      externalReloadPending.current = false;
      reload();
      return;
    }
    // Caso filtros tenham sido carregados do localStorage e diferem do DEFAULT,
    // podemos acionar reload (mas somente se não for o primeiro mount já tratado pelo hook usePedidos).
    // O hook usePedidos já observa params e recarrega, então não precisamos duplicar.
    // Mantemos vazio para evitar fetch duplo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleDelete = async (p, e) => {
    e?.stopPropagation?.();
    const ok = window.confirm(
      `Excluir pedido #${p.id}? Esta ação remove movimentos e itens relacionados.`,
    );
    if (!ok) return;
    try {
      await deleteOrderService(p.id);
      push(`Pedido #${p.id} excluído.`, { type: "success" });
      await reload();
    } catch (err) {
      push(err.message || "Falha ao excluir pedido", { type: "error" });
    }
  };

  return (
    <div className="text-sm">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReload={reload}
        onClear={() => {
          setFilters(DEFAULT_ORDER_FILTERS);
          if (typeof window !== "undefined") {
            try {
              window.localStorage.removeItem(ORDERS_FILTERS_STORAGE_KEY);
              const url = new URL(window.location.href);
              ["tipo", "q", "from", "to"].forEach((k) =>
                url.searchParams.delete(k),
              );
              window.history.replaceState({}, "", url.toString());
            } catch (e) {
              // ignore
            }
          }
          reload();
        }}
      />
      <div className="overflow-auto border rounded">
        <table className="min-w-full">
          <OrdersHeader />
          <tbody>
            {data.map((p) => (
              <OrdersRow
                key={p.id}
                p={p}
                onEdit={onEdit}
                reload={reload}
                onDelete={(e) => handleDelete(p, e)}
              />
            ))}
            {!loading && data.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={8}>
                  Nenhum pedido encontrado
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={8}>
                  Carregando...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OrdersManager({ limit = 20 }) {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState(null); // pedido completo quando editando
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  // Removido: lógica de migrar pedidos FIFO em lote (legacyCount)

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
        {/* Dashboard resumido acima da lista */}
        <OrdersDashboard />
        <OrdersBrowser
          limit={limit}
          refreshTick={refreshKey}
          onConfirm={bump}
          onEdit={handleEdit}
        />
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
              bump();
            }}
            onSaved={() => {
              setShowForm(false);
              setEditing(null);
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

// PayPromissoriaModal extraído para ./PayPromissoriaModal
