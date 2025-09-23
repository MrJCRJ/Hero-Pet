import React, { useCallback, useEffect, useMemo, useState } from "react";
const LIST_LIMIT = Number(process.env.NEXT_PUBLIC_PRODUCTS_LIMIT) || 500;
import { Button } from "components/ui/Button";
import { Modal } from "./Modal";
import { ProductForm } from "./ProductForm";
// import { ProductDetail } from "./Detail";

function useProducts() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ativo, setAtivo] = useState("true"); // default: somente ativos
  const [loading, setLoading] = useState(false);
  const query = useMemo(
    () => ({ q, categoria, ativo }),
    [q, categoria, ativo],
  );

  const fetchList = useCallback(
    async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (categoria) params.set("categoria", categoria);
        if (ativo !== "") params.set("ativo", ativo);
        params.set("limit", String(LIST_LIMIT));
        params.set("meta", "1");
        const resp = await fetch(`/api/v1/produtos?${params.toString()}`, {
          cache: "no-store",
        });
        if (!resp.ok) throw new Error(`GET produtos ${resp.status}`);
        const json = await resp.json();
        const data = Array.isArray(json) ? json : json.data;
        const meta = Array.isArray(json) ? { total: null } : json.meta;
        setRows(data);
        setTotal(meta?.total ?? null);
      } finally {
        setLoading(false);
      }
    },
    [q, categoria, ativo],
  );

  const refresh = useCallback(() => {
    fetchList();
  }, [fetchList]);

  return {
    rows,
    total,
    loading,
    query,
    setQ,
    setCategoria,
    setAtivo,
    refresh,
  };
}

export function ProductsManager({ linkSupplierId }) {
  const {
    rows,
    loading,
    query,
    setQ,
    setCategoria,
    setAtivo,
    refresh,
  } = useProducts();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [costMap, setCostMap] = useState({}); // { [id]: { saldo:number|null, custo_medio:number|null, ultimo_custo:number|null } }
  const [onlyBelowMin, setOnlyBelowMin] = useState(false);

  useEffect(() => {
    // debounce simples
    const id = setTimeout(() => refresh(), 250);
    return () => clearTimeout(id);
  }, [query.q, query.categoria, query.ativo, refresh]);

  // Refresh inteligente ao receber evento de inventário dos pedidos
  useEffect(() => {
    function onInventoryChanged(ev) {
      try {
        const ids = ev?.detail?.productIds || [];
        if (!Array.isArray(ids) || !ids.length) return;
        const visibleIds = new Set(rows.map((r) => r.id));
        const anyVisible = ids.some((id) => visibleIds.has(Number(id)));
        if (anyVisible) refresh();
      } catch (_) {
        /* noop */
      }
    }
    window.addEventListener("inventory-changed", onInventoryChanged);
    return () =>
      window.removeEventListener("inventory-changed", onInventoryChanged);
  }, [rows, refresh]);

  // Sem paginação: carregamos até 500 por vez

  // Buscar custo médio/último custo para os produtos visíveis
  useEffect(() => {
    const ids = rows.map((r) => r.id).filter((id) => Number.isFinite(Number(id)));
    const missing = ids.filter((id) => !(id in costMap));
    if (!missing.length) return;
    (async () => {
      await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await fetch(`/api/v1/estoque/saldos?produto_id=${id}`, {
              cache: "no-store",
            });
            const data = await res.json();
            if (res.ok) {
              const cm = Number(data?.custo_medio);
              const uc = Number(data?.ultimo_custo);
              const sd = Number(data?.saldo);
              setCostMap((prev) => ({
                ...prev,
                [id]: {
                  saldo: Number.isFinite(sd) ? sd : null,
                  custo_medio: Number.isFinite(cm) ? cm : null,
                  ultimo_custo: Number.isFinite(uc) ? uc : null,
                },
              }));
            } else {
              setCostMap((prev) => ({ ...prev, [id]: { saldo: null, custo_medio: null, ultimo_custo: null } }));
            }
          } catch (_) {
            setCostMap((prev) => ({ ...prev, [id]: { saldo: null, custo_medio: null, ultimo_custo: null } }));
          }
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function renderPrecoCell(p) {
    const cm = costMap[p.id]?.custo_medio ?? null;
    const uc = costMap[p.id]?.ultimo_custo ?? null;
    const vendaTabela = p.preco_tabela != null ? Number(p.preco_tabela) : null;
    let venda = vendaTabela;
    if (!(Number.isFinite(venda) && venda > 0)) {
      const base = Number.isFinite(cm) && cm > 0 ? cm : Number.isFinite(uc) && uc > 0 ? uc : null;
      let mk = Number(p.markup_percent_default);
      if (!Number.isFinite(mk) || mk <= 0) mk = 30; // fallback visual
      venda = base == null ? null : Number((base * (1 + mk / 100)).toFixed(2));
    }
    return (
      <div className="text-xs">
        <div className="flex items-center justify-between" title="Média ponderada de compras">
          <span className="opacity-70">Compra</span>
          <span>{Number.isFinite(cm) && cm > 0 ? `R$ ${cm.toFixed(2)}` : "-"}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5" title="Preço de venda (tabela ou custo×markup)">
          <span className="opacity-70">Venda</span>
          <span>{Number.isFinite(venda) && venda > 0 ? `R$ ${venda.toFixed(2)}` : "-"}</span>
        </div>
      </div>
    );
  }

  function renderEstoqueCell(p) {
    const saldo = costMap[p.id]?.saldo;
    const minConfigured = p.estoque_minimo != null ? Number(p.estoque_minimo) : null;
    const minHint = costMap[p.id]?.min_hint ?? null;
    const minimo = minConfigured != null ? minConfigured : minHint;
    const below = Number.isFinite(saldo) && Number.isFinite(minimo) && saldo < minimo;
    return (
      <div className="text-xs">
        <div className="flex items-center justify-between" title="Estoque atual do produto">
          <span className="opacity-70">Atual</span>
          <span className={below ? "text-red-500 font-medium" : ""} title={below ? "Abaixo do estoque mínimo" : undefined}>
            {Number.isFinite(saldo) ? saldo.toFixed(3) : "-"}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5" title={minConfigured != null ? "Estoque mínimo cadastrado" : "Estoque mínimo sugerido (30 dias de consumo)"}>
          <span className="opacity-70">Mínimo</span>
          <span>{Number.isFinite(minimo) ? minimo.toFixed(0) : "-"}</span>
        </div>
        {null}
      </div>
    );
  }

  // Buscar sugestão de estoque mínimo (30 dias) para produtos sem mínimo cadastrado
  useEffect(() => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const missing = rows
      .filter((p) => (p.estoque_minimo == null) && !(costMap[p.id] && Object.prototype.hasOwnProperty.call(costMap[p.id], 'min_hint')))
      .map((p) => p.id);
    if (!missing.length) return;
    (async () => {
      await Promise.all(
        missing.map(async (id) => {
          try {
            const url = `/api/v1/estoque/movimentos?produto_id=${id}&tipo=SAIDA&from=${encodeURIComponent(from)}&limit=200`;
            const res = await fetch(url, { cache: 'no-store' });
            const data = await res.json();
            let hint = null;
            if (res.ok && Array.isArray(data)) {
              const totalSaida = data.reduce((acc, mv) => acc + (Number(mv.quantidade) || 0), 0);
              hint = Math.max(0, Math.ceil(totalSaida));
            }
            setCostMap((prev) => ({
              ...prev,
              [id]: { ...(prev[id] || {}), min_hint: hint },
            }));
          } catch (_) {
            setCostMap((prev) => ({
              ...prev,
              [id]: { ...(prev[id] || {}), min_hint: null },
            }));
          }
        })
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  function openNew(prefill) {
    setEditing(prefill || null);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setShowModal(true);
  }

  // Detalhe removido da UI; manteremos código comentado caso precise voltar
  // function openDetail(item) {
  //   setEditing(item);
  //   setShowDetail(true);
  // }

  async function handleSubmit(data) {
    try {
      setSubmitting(true);
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `/api/v1/produtos/${editing.id}`
        : "/api/v1/produtos";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao salvar produto");
      }
      setShowModal(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInactivate(p) {
    if (!p?.id) return;
    const ok = window.confirm(`Inativar produto "${p.nome}"?`);
    if (!ok) return;
    const resp = await fetch(`/api/v1/produtos/${p.id}`, { method: "DELETE" });
    if (!resp.ok) {
      const txt = await resp.text();
      alert(`Falha ao inativar: ${resp.status} ${txt}`);
      return;
    }
    refresh();
  }

  async function handleReactivate(p) {
    if (!p?.id) return;
    const ok = window.confirm(`Reativar produto "${p.nome}"?`);
    if (!ok) return;
    const resp = await fetch(`/api/v1/produtos/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: p.nome, categoria: p.categoria || null, ativo: true }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      alert(`Falha ao reativar: ${resp.status} ${txt}`);
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          placeholder="Buscar por nome (q)"
          value={query.q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          placeholder="Categoria"
          value={query.categoria}
          onChange={(e) => setCategoria(e.target.value)}
        />
        <select
          className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          value={query.ativo}
          onChange={(e) => setAtivo(e.target.value)}
        >
          <option value="">Ativo: Todos</option>
          <option value="true">Somente ativos</option>
          <option value="false">Somente inativos</option>
        </select>
        <label className="flex items-center gap-2 text-sm px-1">
          <input
            type="checkbox"
            checked={onlyBelowMin}
            onChange={(e) => setOnlyBelowMin(e.target.checked)}
          />
          Abaixo do mínimo
        </label>
      </div>

      <div className="flex justify-between items-center gap-2">
        <div>
          <Button variant="outline" onClick={refresh} fullWidth={false}>
            Atualizar
          </Button>
        </div>
        {Number.isFinite(Number(linkSupplierId)) && (
          <Button
            onClick={() =>
              openNew({ ativo: true, suppliers: [Number(linkSupplierId)] })
            }
          >
            Novo Produto para Fornecedor #{Number(linkSupplierId)}
          </Button>
        )}
        <Button onClick={() => openNew()}>Novo Produto</Button>
      </div>

      <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[var(--color-bg-secondary)]">
            <tr>
              <th className="p-2">Nome</th>
              <th className="p-2">Categoria</th>
              <th className="p-2">Fornecedores</th>
              <th className="p-2">Preço</th>
              <th className="p-2">Estoque</th>
              <th className="p-2 w-1">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(onlyBelowMin
              ? rows.filter((p) => {
                const saldo = costMap[p.id]?.saldo;
                const minConfigured = p.estoque_minimo != null ? Number(p.estoque_minimo) : null;
                const minHint = costMap[p.id]?.min_hint ?? null;
                const minimo = minConfigured != null ? minConfigured : minHint;
                return Number.isFinite(saldo) && Number.isFinite(minimo) && saldo < minimo;
              })
              : rows
            ).map((p) => (
              <tr
                key={p.id}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] cursor-pointer"
                onClick={() => openEdit(p)}
                title="Clique na linha para editar"
              >
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${p.ativo ? "bg-green-500" : "bg-red-500"}`}
                      title={p.ativo ? "Ativo" : "Inativo"}
                    />
                    <span>{p.nome}</span>
                  </div>
                </td>
                <td className="p-2">{p.categoria || "-"}</td>
                <td className="p-2 text-xs">
                  {Array.isArray(p.supplier_labels) && p.supplier_labels.length
                    ? p.supplier_labels
                      .map((s) => s.name || s.label || `#${s.id}`)
                      .join(", ")
                    : "-"}
                </td>
                <td className="p-2">{renderPrecoCell(p)}</td>
                <td className="p-2">{renderEstoqueCell(p)}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {p.ativo ? (
                      <button
                        className="h-7 w-7 flex items-center justify-center rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                        title="Inativar"
                        aria-label="Inativar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInactivate(p);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-12.536a6 6 0 00-8.485 8.485l8.485-8.485zm1.414 1.414l-8.485 8.485a6 6 0 008.485-8.485z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    ) : (
                      <button
                        className="h-7 w-7 flex items-center justify-center rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                        title="Reativar"
                        aria-label="Reativar"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReactivate(p);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0L3.293 11.707a1 1 0 011.414-1.414L8 13.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={6}
                  className="p-4 text-center text-[var(--color-text-secondary)]"
                >
                  {loading ? "Carregando..." : "Nenhum produto encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {null}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Editar Produto" : "Novo Produto"}
      >
        <ProductForm
          initial={editing || { ativo: true, suppliers: [] }}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </Modal>
      {false && (
        <div />
      )}
    </div>
  );
}
