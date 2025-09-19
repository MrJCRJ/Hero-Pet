import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "components/ui/Button";

function fmtBRL(v) {
  if (v == null) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `R$ ${n.toFixed(2)}`;
}

export function ProductDetail({ open, onClose, product }) {
  const [saldos, setSaldos] = useState(null);
  const [loadingSaldos, setLoadingSaldos] = useState(false);

  const [movs, setMovs] = useState([]);
  const [movTotal, setMovTotal] = useState(null);
  const [movLoading, setMovLoading] = useState(false);
  const [tipo, setTipo] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);

  const canLoadMore = useMemo(() => (movTotal == null ? false : movs.length < movTotal), [movs.length, movTotal]);

  useEffect(() => {
    if (!open || !product?.id) return;
    setLoadingSaldos(true);
    fetch(`/api/v1/estoque/saldos?produto_id=${product.id}`)
      .then((r) => r.json())
      .then((j) => setSaldos(j))
      .catch(() => setSaldos(null))
      .finally(() => setLoadingSaldos(false));
  }, [open, product?.id]);

  useEffect(() => {
    if (!open || !product?.id) return;
    setMovLoading(true);
    const params = new URLSearchParams();
    params.set("produto_id", String(product.id));
    if (tipo) params.set("tipo", tipo);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    params.set("meta", "1");
    fetch(`/api/v1/estoque/movimentos?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        const data = Array.isArray(j) ? j : j.data;
        const meta = Array.isArray(j) ? { total: null } : j.meta;
        setMovs((prev) => (offset === 0 ? data : [...prev, ...data]));
        setMovTotal(meta?.total ?? null);
      })
      .catch(() => { })
      .finally(() => setMovLoading(false));
  }, [open, product?.id, tipo, from, to, limit, offset]);

  // filtros e paginação controlam o offset diretamente

  return (
    <Modal open={open} onClose={onClose} title={product ? `Detalhe: ${product.nome}` : "Detalhe do Produto"}>
      {!product ? (
        <div className="p-4">Produto inválido.</div>
      ) : (
        <div className="space-y-4">
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-md border border-[var(--color-border)]">
              <div className="text-xs text-[var(--color-text-secondary)]">Saldo</div>
              <div className="text-lg font-semibold">{loadingSaldos ? "…" : saldos?.saldo ?? "-"}</div>
            </div>
            <div className="p-3 rounded-md border border-[var(--color-border)]">
              <div className="text-xs text-[var(--color-text-secondary)]">Custo médio</div>
              <div className="text-lg font-semibold">{loadingSaldos ? "…" : fmtBRL(saldos?.custo_medio)}</div>
            </div>
            <div className="p-3 rounded-md border border-[var(--color-border)]">
              <div className="text-xs text-[var(--color-text-secondary)]">Último custo</div>
              <div className="text-lg font-semibold">{loadingSaldos ? "…" : fmtBRL(saldos?.ultimo_custo)}</div>
            </div>
          </section>

          <div className="p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] text-xs">
            Movimentos de estoque são gerados automaticamente pelos Pedidos. Este painel exibe saldos e histórico (somente leitura).
          </div>

          <section className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <select className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" value={tipo} onChange={(e) => { setTipo(e.target.value); setOffset(0); }}>
                <option value="">Tipo: Todos</option>
                <option value="ENTRADA">ENTRADA</option>
                <option value="SAIDA">SAÍDA</option>
                <option value="AJUSTE">AJUSTE</option>
              </select>
              <input type="date" className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }} />
              <input type="date" className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }} />
              <select className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" value={limit} onChange={(e) => { setLimit(Number(e.target.value) || 10); setOffset(0); }}>
                <option value={10}>10 por página</option>
                <option value={20}>20 por página</option>
              </select>
              <div className="flex items-center">
                <Button fullWidth={false} onClick={() => setOffset(0)} loading={movLoading}>Recarregar</Button>
              </div>
            </div>

            <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[var(--color-bg-secondary)]">
                  <tr>
                    <th className="p-2">Data</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Qtd</th>
                    <th className="p-2">Valor Un.</th>
                    <th className="p-2">Total</th>
                    <th className="p-2">Doc</th>
                    <th className="p-2">Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.map((m) => (
                    <tr key={m.id} className="border-t border-[var(--color-border)]">
                      <td className="p-2">{new Date(m.data_movimento).toLocaleString()}</td>
                      <td className="p-2">{m.tipo}</td>
                      <td className="p-2">{m.quantidade}</td>
                      <td className="p-2">{m.valor_unitario != null ? fmtBRL(m.valor_unitario) : "-"}</td>
                      <td className="p-2">{m.valor_total != null ? fmtBRL(m.valor_total) : "-"}</td>
                      <td className="p-2">{m.documento || "-"}</td>
                      <td className="p-2">{m.observacao || "-"}</td>
                    </tr>
                  ))}
                  {!movs.length && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-[var(--color-text-secondary)]">{movLoading ? "Carregando..." : "Nenhum movimento encontrado."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button fullWidth={false} onClick={() => setOffset((o) => o + limit)} disabled={!canLoadMore || movLoading} loading={movLoading}>Carregar mais</Button>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
