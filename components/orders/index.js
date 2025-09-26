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

export function OrdersBrowser({ limit = 20, refreshTick = 0, onEdit }) {
  const [filters, setFilters] = useState({ tipo: "", q: "", from: "", to: "" });
  const { loading, data, reload } = usePedidos(filters, limit);
  const { push } = useToast();
  useEffect(() => {
    // quando refreshTick muda, recarrega
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

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
    }
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
      <FilterBar filters={filters} onChange={setFilters} onReload={reload} />
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
  const [legacyCount, setLegacyCount] = useState(0);
  const [loadingLegacy, setLoadingLegacy] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const loadLegacyCount = useCallback(async () => {
    try {
      setLoadingLegacy(true);
      const r = await fetch("/api/v1/pedidos/legacy_count");
      if (!r.ok) return;
      const j = await r.json();
      if (typeof j.legacy_count === "number") setLegacyCount(j.legacy_count);
    } finally {
      setLoadingLegacy(false);
    }
  }, []);

  useEffect(() => {
    if (!showForm) loadLegacyCount();
  }, [showForm, loadLegacyCount, refreshKey]);

  async function handleMigrateAll() {
    if (!legacyCount) return;
    const ok = window.confirm(
      `Migrar ${legacyCount} pedido(s) legacy para FIFO agora?`,
    );
    if (!ok) return;
    try {
      setMigrating(true);
      const resp = await fetch("/api/v1/pedidos/migrate_fifo_all", {
        method: "POST",
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error || "Falha ao migrar");
      await loadLegacyCount();
      bump();
      alert(`Migrados: ${json.migrated}. ${json.remaining_hint || ""}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setMigrating(false);
    }
  }

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
            {loadingLegacy && (
              <span className="text-xs opacity-60 animate-pulse">
                verificando legacy…
              </span>
            )}
            {!loadingLegacy && legacyCount > 0 && (
              <button
                onClick={handleMigrateAll}
                disabled={migrating}
                className="text-xs px-2 py-1 rounded bg-amber-600/20 text-amber-500 border border-amber-600/40 hover:bg-amber-600/30 disabled:opacity-50"
                title="Existem pedidos de venda antigos sem custos FIFO aplicados"
              >
                {migrating ? "Migrando..." : `Migrar FIFO (${legacyCount})`}
              </button>
            )}
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
