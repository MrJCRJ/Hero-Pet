import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "components/ui/Button";
import { Modal } from "./Modal";
import { ProductForm } from "./ProductForm";
import { ProductDetail } from "./Detail";

function useProducts() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ativo, setAtivo] = useState("true"); // default: somente ativos
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const query = useMemo(
    () => ({ q, categoria, ativo, limit, offset }),
    [q, categoria, ativo, limit, offset],
  );

  const offsetRef = useRef(0);

  const fetchList = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (categoria) params.set("categoria", categoria);
        if (ativo !== "") params.set("ativo", ativo);
        params.set("limit", String(limit));
        const baseOffset = reset ? 0 : offsetRef.current;
        params.set("offset", String(baseOffset));
        params.set("meta", "1");
        const resp = await fetch(`/api/v1/produtos?${params.toString()}`, {
          cache: "no-store",
        });
        if (!resp.ok) throw new Error(`GET produtos ${resp.status}`);
        const json = await resp.json();
        const data = Array.isArray(json) ? json : json.data;
        const meta = Array.isArray(json) ? { total: null } : json.meta;
        setRows((prev) => (reset ? data : [...prev, ...data]));
        setTotal(meta?.total ?? null);
        setOffset((prev) => {
          const next = (reset ? 0 : prev) + data.length;
          offsetRef.current = next;
          return next;
        });
      } finally {
        setLoading(false);
      }
    },
    [q, categoria, ativo, limit],
  );

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    setOffset(0);
    fetchList(true);
  }, [fetchList]);

  const loadMore = useCallback(() => {
    fetchList(false);
  }, [fetchList]);

  return {
    rows,
    total,
    loading,
    query,
    setQ,
    setCategoria,
    setAtivo,
    setLimit,
    refresh,
    loadMore,
  };
}

export function ProductsManager({ linkSupplierId }) {
  const {
    rows,
    total,
    loading,
    query,
    setQ,
    setCategoria,
    setAtivo,
    setLimit,
    refresh,
    loadMore,
  } = useProducts();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [costMap, setCostMap] = useState({}); // { [id]: { custo_medio:number|null, ultimo_custo:number|null } }

  useEffect(() => {
    // debounce simples
    const id = setTimeout(() => refresh(), 250);
    return () => clearTimeout(id);
  }, [query.q, query.categoria, query.ativo, query.limit, refresh]);

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

  const canLoadMore = total == null ? false : rows.length < total;

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
              setCostMap((prev) => ({
                ...prev,
                [id]: {
                  custo_medio: Number.isFinite(cm) ? cm : null,
                  ultimo_custo: Number.isFinite(uc) ? uc : null,
                },
              }));
            } else {
              setCostMap((prev) => ({ ...prev, [id]: { custo_medio: null, ultimo_custo: null } }));
            }
          } catch (_) {
            setCostMap((prev) => ({ ...prev, [id]: { custo_medio: null, ultimo_custo: null } }));
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

  function openNew(prefill) {
    setEditing(prefill || null);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setShowModal(true);
  }

  function openDetail(item) {
    setEditing(item);
    setShowDetail(true);
  }

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
        <select
          className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          value={query.limit}
          onChange={(e) => setLimit(Number(e.target.value) || 10)}
        >
          <option value={10}>10 por página</option>
          <option value={20}>20 por página</option>
          <option value={50}>50 por página</option>
        </select>
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
              <th className="p-2 w-1">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-[var(--color-border)]">
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
                <td className="p-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      fullWidth={false}
                      onClick={() => openDetail(p)}
                    >
                      Detalhe
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      fullWidth={false}
                      onClick={() => openEdit(p)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth={false}
                      onClick={() => handleInactivate(p)}
                    >
                      Inativar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-[var(--color-text-secondary)]"
                >
                  {loading ? "Carregando..." : "Nenhum produto encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[var(--color-text-secondary)] text-xs">
          {total != null ? `${rows.length} de ${total}` : `${rows.length}`}{" "}
          registros
        </div>
        <Button
          onClick={loadMore}
          disabled={!canLoadMore || loading}
          loading={loading}
          fullWidth={false}
        >
          Carregar mais
        </Button>
      </div>
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
      <ProductDetail
        open={showDetail}
        onClose={() => setShowDetail(false)}
        product={editing}
      />
    </div>
  );
}
