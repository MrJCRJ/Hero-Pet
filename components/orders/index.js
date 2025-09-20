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
      <div>
        <label className="block text-xs mb-1">Status</label>
        <select
          className="border rounded px-2 py-1"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
        >
          <option value="">Todos</option>
          <option value="confirmado">confirmado</option>
          <option value="cancelado">cancelado</option>
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
      <Button fullWidth={false} onClick={onReload}>Atualizar</Button>
    </div>
  );
}

function usePedidos(filters, limit = 20) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.tipo) p.set("tipo", filters.tipo);
    if (filters.status) p.set("status", filters.status);
    if (filters.q) p.set("q", filters.q);
    p.set("limit", String(limit));
    return p.toString();
  }, [filters, limit]);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/pedidos?${params}`, { cache: 'no-store' });
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
  const [filters, setFilters] = useState({ tipo: "", status: "", q: "" });
  const { loading, data, reload } = usePedidos(filters, limit);
  useEffect(() => {
    // quando refreshTick muda, recarrega
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  // confirmação não é mais usada (CRUD sem rascunhos)

  return (
    <div className="text-sm">
      <FilterBar filters={filters} onChange={setFilters} onReload={reload} />
      <div className="overflow-auto border rounded">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Parceiro</th>
              <th className="text-left px-3 py-2">Emissão</th>
              <th className="text-center px-3 py-2">NF</th>
              <th className="text-center px-3 py-2">Promissórias</th>
              <th className="text-right px-3 py-2">Total / Pago</th>
              <th className="text-center px-3 py-2">Parcelas</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.id}</td>
                <td className="px-3 py-2">{p.tipo}</td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">{p.partner_name || '-'}</td>
                <td className="px-3 py-2">{p.data_emissao ? new Date(p.data_emissao).toLocaleDateString() : '-'}</td>
                <td className="px-3 py-2 text-center">
                  {p.tem_nota_fiscal ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      📄 NF
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {p.parcelado ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      📝 Promissórias
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{
                  (() => {
                    const n = p.total_liquido != null ? Number(p.total_liquido) : NaN;
                    const totalFmt = Number.isFinite(n)
                      ? n.toLocaleString(undefined, { style: 'currency', currency: 'BRL' })
                      : '-';
                    const pago = p.total_pago != null ? Number(p.total_pago) : 0;
                    const pagoFmt = Number.isFinite(pago)
                      ? pago.toLocaleString(undefined, { style: 'currency', currency: 'BRL' })
                      : 'R$ 0,00';
                    return (
                      <div className="text-right">
                        <div>{totalFmt}</div>
                        <div className="text-xs text-blue-600 dark:text-blue-300">Pago: {pagoFmt}</div>
                      </div>
                    );
                  })()
                }</td>
                <td className="px-3 py-2 text-center">
                  <PromissoriasDots pedidoId={p.id} count={p.numero_promissorias} />
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" fullWidth={false} variant="outline" onClick={() => onEdit && onEdit(p)}>Editar</Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && data.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={9}>Nenhum pedido encontrado</td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={9}>Carregando...</td>
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
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Pedidos</h2>
          <Button onClick={() => setShowForm(true)} variant="primary" fullWidth={false}>
            Adicionar
          </Button>
        </div>
        <OrdersBrowser limit={limit} refreshTick={refreshKey} onConfirm={bump} onEdit={handleEdit} />
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
            onCreated={() => { setShowForm(false); setEditing(null); bump(); }}
            onSaved={() => { setShowForm(false); setEditing(null); bump(); }}
          />
          <div className="flex justify-end mt-2">
            <Button variant="secondary" fullWidth={false} onClick={() => { setShowForm(false); setEditing(null); }}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromissoriasDots({ pedidoId }) {
  const [rows, setRows] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(null); // seq da promissória com menu aberto
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/pedidos/${pedidoId}/promissorias`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Falha ao carregar parcelas');
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pedidoId]);

  const reloadPromissorias = async () => {
    try {
      const res = await fetch(`/api/v1/pedidos/${pedidoId}/promissorias`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao recarregar promissórias:', e);
    }
  };

  const handleGeneratePix = async (seq) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/pedidos/${pedidoId}/promissorias/${seq}?action=pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao gerar PIX');

      // Copiar BRCode para clipboard
      if (data.brcode && navigator.clipboard) {
        await navigator.clipboard.writeText(data.brcode);
        alert(`PIX gerado! BRCode copiado para área de transferência.\nTXID: ${data.txid}`);
      } else {
        alert(`PIX gerado!\nTXID: ${data.txid}\nBRCode: ${data.brcode || 'N/A'}`);
      }

      await reloadPromissorias();
    } catch (e) {
      alert(`Erro: ${e.message}`);
    } finally {
      setActionLoading(false);
      setMenuOpen(null);
    }
  };

  const handleMarkPaid = async (seq) => {
    if (!confirm('Confirma o pagamento desta promissória?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/pedidos/${pedidoId}/promissorias/${seq}?action=pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha ao marcar como pago');

      alert('Promissória marcada como paga!');
      await reloadPromissorias();
    } catch (e) {
      alert(`Erro: ${e.message}`);
    } finally {
      setActionLoading(false);
      setMenuOpen(null);
    }
  };

  const colorFor = (status) => {
    if (status === 'PAGO') return 'bg-green-500';
    if (status === 'ATRASADO') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const borderFor = (row) => {
    // Adiciona borda se PIX já foi gerado
    if (row.pix_txid) return 'ring-2 ring-blue-400';
    return '';
  };

  if (loading) return <span className="text-xs text-gray-400">...</span>;
  if (!rows || rows.length === 0) return <span className="text-gray-400">-</span>;

  return (
    <div className="relative inline-flex gap-1">
      {rows.map((r) => (
        <div key={r.seq} className="relative">
          <button
            onClick={() => setMenuOpen(menuOpen === r.seq ? null : r.seq)}
            title={`${r.status} • vence ${new Date(r.due_date).toLocaleDateString()} • ${Number(r.amount).toLocaleString(undefined, { style: 'currency', currency: 'BRL' })}${r.pix_txid ? ' • PIX gerado' : ''}`}
            className={`inline-block w-2.5 h-2.5 rounded-full ${colorFor(r.status)} ${borderFor(r)} cursor-pointer hover:scale-110 transition-transform`}
            disabled={actionLoading}
          />

          {menuOpen === r.seq && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg z-50 min-w-[120px]">
              {r.status !== 'PAGO' && (
                <>
                  <button
                    onClick={() => handleGeneratePix(r.seq)}
                    disabled={actionLoading}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {r.pix_txid ? '🔄 Regerar PIX' : '💳 Gerar PIX'}
                  </button>
                  <button
                    onClick={() => handleMarkPaid(r.seq)}
                    disabled={actionLoading}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    ✅ Marcar Pago
                  </button>
                </>
              )}
              {r.status === 'PAGO' && (
                <div className="px-3 py-2 text-xs text-green-600 dark:text-green-400">
                  ✅ Pago em {new Date(r.paid_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Clique fora para fechar menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(null)}
        />
      )}
    </div>
  );
}
