import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "../ui/Button";
import { PedidoForm } from "../PedidoForm";

function FilterBar({ filters, onChange, onReload }) {
  return (
    <div className="flex flex-wrap gap-2 items-end mb-3">
      <div>
        <label className="block text-xs mb-1">Tipo</label>
        <select
          className="border rounded px-2 py-1"
          value={filters.tipo}
          onChange={(e) => onChange({ ...filters, tipo: e.target.value })}
        >
          <option value="">Todos</option>
          <option value="VENDA">VENDA</option>
          <option value="COMPRA">COMPRA</option>
        </select>
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs mb-1">Busca</label>
        <input
          className="w-full border rounded px-2 py-1"
          placeholder="Parceiro ou documento"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
        />
      </div>
      <Button fullWidth={false} onClick={onReload}>
        Atualizar
      </Button>
    </div>
  );
}

function usePedidos(filters, limit = 20) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.tipo) p.set("tipo", filters.tipo);
    if (filters.q) p.set("q", filters.q);
    p.set("limit", String(limit));
    return p.toString();
  }, [filters, limit]);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/pedidos?${params}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar pedidos");
      setData(Array.isArray(json?.data) ? json.data : json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return { loading, data, reload };
}

export function OrdersBrowser({ limit = 20, refreshTick = 0, onEdit }) {
  const [filters, setFilters] = useState({ tipo: "", q: "" });
  const { loading, data, reload } = usePedidos(filters, limit);
  useEffect(() => {
    // quando refreshTick muda, recarrega
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  return (
    <div className="text-sm">
      <FilterBar filters={filters} onChange={setFilters} onReload={reload} />
      <div className="overflow-auto border rounded">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2 w-[160px] max-w-[160px]">Parceiro</th>
              <th className="text-left px-3 py-2">Emissão</th>
              <th className="text-center px-3 py-2">NF</th>
              <th className="text-center px-3 py-2" title="Duplicadas">
                Dupl.
              </th>
              <th className="text-right px-3 py-2">Total</th>
              <th className="text-center px-3 py-2">Parcelas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr
                key={p.id}
                className="border-t hover:bg-[var(--color-bg-secondary)] cursor-pointer"
                onClick={() => onEdit && onEdit(p)}
              >
                <td className="px-3 py-2">{p.tipo}</td>
                <td className="px-3 py-2 w-[160px] align-top">
                  <div
                    className="max-w-[160px] truncate whitespace-nowrap"
                    title={p.partner_name || "-"}
                  >
                    {p.partner_name || "-"}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {p.data_emissao
                    ? new Date(p.data_emissao).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-3 py-2 text-center">
                  {p.tipo === "VENDA" && p.tem_nota_fiscal ? (
                    <Button
                      size="sm"
                      variant="outline"
                      fullWidth={false}
                      className="rounded-full text-sm !px-2 !py-1 leading-none bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200 focus-visible:ring-blue-500 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();

                        window.open(
                          `/api/v1/pedidos/${p.id}/nf`,
                          "_blank",
                          "noopener",
                        );
                      }}
                      title="Baixar NF (PDF)"
                    >
                      📄
                    </Button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {p.tipo === "VENDA" && Number(p.numero_promissorias) >= 1 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      fullWidth={false}
                      className="rounded-full text-sm !px-2 !py-1 leading-none bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200 focus-visible:ring-amber-500 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();

                        window.open(
                          `/api/v1/pedidos/${p.id}/promissorias-pdf`,
                          "_blank",
                          "noopener",
                        );
                      }}
                      title="Baixar Duplicadas (PDF)"
                    >
                      📝
                    </Button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {(() => {
                    const tl = p.total_liquido != null ? Number(p.total_liquido) : NaN;
                    const ft = p.frete_total != null ? Number(p.frete_total) : 0;
                    const totalComFrete = (Number.isFinite(tl) ? tl : 0) + (Number.isFinite(ft) ? ft : 0);
                    const totalFmt = Number.isFinite(totalComFrete)
                      ? totalComFrete.toLocaleString(undefined, {
                        style: "currency",
                        currency: "BRL",
                      })
                      : "-";
                    const pago =
                      p.total_pago != null ? Number(p.total_pago) : 0;
                    const pagoFmt = Number.isFinite(pago)
                      ? pago.toLocaleString(undefined, {
                        style: "currency",
                        currency: "BRL",
                      })
                      : "R$ 0,00";
                    const fullyPaid =
                      Number.isFinite(totalComFrete) && Number.isFinite(pago)
                        ? Math.abs(pago - totalComFrete) < 0.005 || pago > totalComFrete
                        : false;
                    return (
                      <div className="text-right">
                        <div>{totalFmt}</div>
                        {!fullyPaid && (
                          <div className="text-xs text-blue-600 dark:text-blue-300">
                            Pago: {pagoFmt}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-3 py-2 text-center">
                  <PromissoriasDots
                    pedidoId={p.id}
                    count={p.numero_promissorias}
                    onChanged={reload}
                  />
                </td>
              </tr>
            ))}
            {!loading && data.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={7}>
                  Nenhum pedido encontrado
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={7}>
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
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Pedidos</h2>
          <Button
            onClick={() => setShowForm(true)}
            variant="primary"
            fullWidth={false}
          >
            Adicionar
          </Button>
        </div>
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
          {editing ? `Editando Pedido #${editing.id}` : "Novo Pedido"}
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

function PromissoriasDots({ pedidoId, count, onChanged }) {
  const [rows, setRows] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(null); // seq da promissória com menu aberto
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/pedidos/${pedidoId}/promissorias`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "Falha ao carregar parcelas");
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pedidoId]);

  const reloadPromissorias = async () => {
    try {
      const res = await fetch(`/api/v1/pedidos/${pedidoId}/promissorias`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erro ao recarregar promissórias:", e);
    }
  };

  const handleMarkPaid = async (seq) => {
    if (!confirm("Confirma o pagamento desta promissória?")) return;

    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/v1/pedidos/${pedidoId}/promissorias/${seq}?action=pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao marcar como pago");

      alert("Promissória marcada como paga!");
      await reloadPromissorias();
      // avisa o pai para atualizar totais (Total / Pago)
      if (typeof onChanged === "function") onChanged();
    } catch (e) {
      alert(`Erro: ${e.message}`);
    } finally {
      setActionLoading(false);
      setMenuOpen(null);
    }
  };

  const colorFor = (status) => {
    if (status === "PAGO") return "bg-green-500";
    if (status === "ATRASADO") return "bg-red-500";
    return "bg-yellow-500";
  };

  const borderFor = () => ""; // sem destaque de PIX

  if (loading) return <span className="text-xs text-gray-400">...</span>;
  if (!rows || rows.length === 0) {
    const n = Math.max(0, Number(count) || 0);
    if (n >= 1) {
      return (
        <div className="relative inline-flex gap-1" title={`${n} parcela(s)`}>
          {Array.from({ length: n }).map((_, i) => (
            <button
              key={i}
              type="button"
              className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500 cursor-pointer hover:scale-110 transition-transform"
              title={`Abrir parcela #${i + 1}`}
              disabled={actionLoading}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await reloadPromissorias();
                } catch (e) {
                  // fallback: erro ao recarregar promissórias (ignorado)
                  console.debug("reloadPromissorias falhou", e);
                }
                setMenuOpen(i + 1);
              }}
            />
          ))}

          {Number.isInteger(menuOpen) && (
            <>
              <div
                className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg z-50 min-w-[160px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 text-xs opacity-70">
                  Dados indisponíveis (ainda)
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await reloadPromissorias();
                    // mantém menu aberto; se rows carregar, o componente migra para o modo completo
                  }}
                  disabled={actionLoading}
                  className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  🔄 Recarregar parcelas
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(null);
                  }}
                  className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  ✖️ Fechar
                </button>
              </div>
              {/* Clique fora para fechar menu */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(null)}
              />
            </>
          )}
        </div>
      );
    }
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="relative inline-flex gap-1">
      {rows.map((r) => (
        <div key={r.seq} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // não abre menu para parcelas já pagas
              if (r.status === "PAGO") return;
              setMenuOpen(menuOpen === r.seq ? null : r.seq);
            }}
            title={`${r.status} • vence ${new Date(r.due_date).toLocaleDateString()} • ${Number(r.amount).toLocaleString(undefined, { style: "currency", currency: "BRL" })}`}
            className={`inline-block w-2.5 h-2.5 rounded-full ${colorFor(r.status)} ${borderFor(r)} ${r.status === "PAGO" ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
            disabled={actionLoading || r.status === "PAGO"}
          />

          {menuOpen === r.seq && r.status !== "PAGO" && (
            <div
              className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg z-50 min-w-[120px]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleMarkPaid(r.seq)}
                disabled={actionLoading}
                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                ✅ Marcar Pago
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Clique fora para fechar menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
      )}

      {/* Sem modal de edição de vencimento */}
    </div>
  );
}
