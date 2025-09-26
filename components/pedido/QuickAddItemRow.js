import React from "react";
import { Button } from "../ui/Button";
import { SelectionModal } from "../common/SelectionModal";
// Modal genérico substituído pelo componente PriceSuggestionModal
import { PriceSuggestionModal } from "./PriceSuggestionModal";
import { useToast } from "../entities/shared/toast";
import { formatQty } from "./utils";
import { fetchLastPurchasePrice } from "./service";

export function QuickAddItemRow({ tipo, itens, onAppend, fetchProdutos }) {
  const { push } = useToast();
  const [label, setLabel] = React.useState("");
  const [produtoId, setProdutoId] = React.useState("");
  const [quantidade, setQuantidade] = React.useState("");
  const [preco, setPreco] = React.useState("");
  const [desconto, setDesconto] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [saldo, setSaldo] = React.useState(null);
  // Estado unificado para modal de sugestão (COMPRA ou VENDA)
  const [suggestionModal, setSuggestionModal] = React.useState({
    open: false,
    mode: null, // 'COMPRA' | 'VENDA'
    data: {
      value: null,
      base: null,
      markup: null,
      sourceLabel: null,
      loading: false,
      error: null,
    },
  });

  // Cache por produto (não refaz fetch se já buscado nessa sessão)
  const purchaseCacheRef = React.useRef(new Map()); // produtoId -> { value }
  const saleCacheRef = React.useRef(new Map()); // produtoId -> { value, base, markup }

  const reservedQty = React.useMemo(() => {
    if (!Array.isArray(itens) || !produtoId) return 0;
    try {
      return itens.reduce((acc, it) => {
        if (String(it?.produto_id || "") === String(produtoId)) {
          const q = Number(it?.quantidade);
          return acc + (Number.isFinite(q) ? q : 0);
        }
        return acc;
      }, 0);
    } catch (_) {
      return 0;
    }
  }, [itens, produtoId]);

  const displaySaldo = React.useMemo(() => {
    if (saldo == null || !Number.isFinite(Number(saldo))) return null;
    const rem =
      Number(saldo) -
      (Number.isFinite(Number(reservedQty)) ? Number(reservedQty) : 0);
    return rem;
  }, [saldo, reservedQty]);

  const handleAdd = () => {
    if (!produtoId) return;
    if (!Number.isFinite(Number(quantidade)) || Number(quantidade) <= 0) return;
    if (
      tipo === "VENDA" &&
      displaySaldo != null &&
      Number.isFinite(Number(displaySaldo)) &&
      Number(quantidade) > Number(displaySaldo)
    ) {
      try {
        push("Quantidade maior que o estoque disponível.", { type: "warning" });
      } catch (_) {
        /* noop */
      }
      return;
    }
    onAppend({
      produto_id: produtoId,
      produto_label: label,
      quantidade,
      preco_unitario: preco,
      desconto_unitario: desconto,
    });
    setQuantidade("");
  };

  return (
    <div className="mb-4 p-3 border rounded-md bg-[var(--color-bg-secondary)]">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs mb-1">Produto</label>
          <button
            type="button"
            className="relative w-full text-left border rounded px-2 pr-24 py-1.5 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)] whitespace-nowrap overflow-hidden"
            onClick={() => setShowModal(true)}
          >
            <span className="inline-block truncate align-middle max-w-full">
              {label || "Selecionar produto"}
            </span>
            {tipo === "VENDA" && produtoId && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
                Est.: {displaySaldo != null ? formatQty(displaySaldo) : "…"}
              </span>
            )}
          </button>
        </div>
        <div>
          <label className="block text-xs mb-1">Quantidade</label>
          <input
            type="number"
            step="1"
            className="w-full border rounded px-2 py-1"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Preço Unitário</label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded px-2 py-1"
            value={preco}
            onChange={(e) => {
              setPreco(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Desconto Unitário</label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded px-2 py-1"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
          />
        </div>
        <div className="text-right">
          <Button
            variant="primary"
            size="sm"
            fullWidth={false}
            className="px-2 py-1"
            onClick={handleAdd}
            aria-label="Adicionar item"
            title={
              tipo === "VENDA" &&
              displaySaldo != null &&
              Number.isFinite(Number(quantidade)) &&
              Number(quantidade) > Number(displaySaldo)
                ? "Estoque insuficiente"
                : "Adicionar item"
            }
            disabled={
              (tipo === "VENDA" &&
                displaySaldo != null &&
                Number.isFinite(Number(quantidade)) &&
                Number(quantidade) > Number(displaySaldo)) ||
              !produtoId ||
              !Number.isFinite(Number(quantidade)) ||
              Number(quantidade) <= 0
            }
            icon={(props) => (
              <svg
                {...props}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 5a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H6a1 1 0 110-2h5V6a1 1 0 011-1z" />
              </svg>
            )}
          />
        </div>
      </div>
      {showModal && (
        <SelectionModal
          title="Selecionar Produto"
          fetcher={fetchProdutos}
          extractLabel={(it) => it.label}
          onSelect={(it) => {
            setShowModal(false);
            if (it) {
              setProdutoId(String(it.id));
              setLabel(it.label);
              if (!quantidade) setQuantidade("1");
              // COMPRA: usar cache ou buscar último preço
              if (tipo === "COMPRA") {
                const cached = purchaseCacheRef.current.get(it.id);
                if (cached) {
                  setSuggestionModal({
                    open: true,
                    mode: "COMPRA",
                    data: {
                      ...cached,
                      loading: false,
                      error: null,
                      sourceLabel: "Último preço de compra",
                    },
                  });
                } else {
                  setSuggestionModal({
                    open: true,
                    mode: "COMPRA",
                    data: {
                      value: null,
                      loading: true,
                      error: null,
                      sourceLabel: "Último preço de compra",
                      base: null,
                      markup: null,
                    },
                  });
                  fetchLastPurchasePrice(it.id)
                    .then((val) => {
                      const normalized =
                        val == null || !Number.isFinite(Number(val))
                          ? null
                          : Number(val);
                      const payload = { value: normalized };
                      purchaseCacheRef.current.set(it.id, payload);
                      setSuggestionModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          value: normalized,
                          loading: false,
                        },
                      }));
                    })
                    .catch(() => {
                      setSuggestionModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          value: null,
                          loading: false,
                          error: "Erro ao buscar último preço",
                        },
                      }));
                    });
                }
              }
              // VENDA: custo + markup
              if (tipo === "VENDA") {
                const cached = saleCacheRef.current.get(it.id);
                if (cached) {
                  setSuggestionModal({
                    open: true,
                    mode: "VENDA",
                    data: { ...cached, loading: false, error: null },
                  });
                } else {
                  setSuggestionModal({
                    open: true,
                    mode: "VENDA",
                    data: {
                      value: null,
                      base: null,
                      markup: null,
                      loading: true,
                      error: null,
                    },
                  });
                  fetch(`/api/v1/estoque/saldos?produto_id=${it.id}`, {
                    cache: "no-store",
                  })
                    .then((res) =>
                      res.json().then((data) => ({ ok: res.ok, data })),
                    )
                    .then(({ ok, data }) => {
                      if (!ok) throw new Error(data?.error || "erro saldo");
                      setSaldo(Number(data.saldo));
                      const custoMedio = Number(data.custo_medio);
                      const ultimoCusto = Number(data.ultimo_custo);
                      const base =
                        Number.isFinite(custoMedio) && custoMedio > 0
                          ? custoMedio
                          : Number.isFinite(ultimoCusto) && ultimoCusto > 0
                            ? ultimoCusto
                            : null;
                      const markupDefault =
                        Number.isFinite(Number(it.markup_percent_default)) &&
                        Number(it.markup_percent_default) > 0
                          ? Number(it.markup_percent_default)
                          : 30;
                      let suggested = null;
                      if (base != null) {
                        suggested = Number(
                          (base * (1 + markupDefault / 100)).toFixed(2),
                        );
                      }
                      const payload = {
                        value: suggested,
                        base,
                        markup: markupDefault,
                      };
                      saleCacheRef.current.set(it.id, payload);
                      setSuggestionModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, ...payload, loading: false },
                      }));
                    })
                    .catch(() => {
                      setSuggestionModal((prev) => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          loading: false,
                          error: "Falha ao calcular preço sugerido",
                        },
                      }));
                    });
                }
              }
            }
          }}
          onClose={() => setShowModal(false)}
          emptyMessage={
            tipo === "COMPRA"
              ? "Este fornecedor não possui produtos relacionados"
              : "Nenhum produto encontrado"
          }
        />
      )}
      {suggestionModal.open && (
        <PriceSuggestionModal
          mode={suggestionModal.mode}
          suggestion={{
            value: suggestionModal.data.value,
            base: suggestionModal.data.base,
            markup: suggestionModal.data.markup,
            sourceLabel: suggestionModal.data.sourceLabel,
            loading: suggestionModal.data.loading,
            error: suggestionModal.data.error,
          }}
          onClose={() =>
            setSuggestionModal((prev) => ({ ...prev, open: false }))
          }
          onApply={(v) => setPreco(String(Number(v).toFixed(2)))}
        />
      )}
    </div>
  );
}
