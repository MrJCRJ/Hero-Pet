import React from "react";
import { useToast } from "components/entities/shared/toast";
import { fetchLastPurchasePrice } from "../service";
import { formatQty } from "../utils";

export function useQuickAddItemRowLogic({ tipo, itens, fetchProdutos, onAppend }) {
  const { push } = useToast();
  const [label, setLabel] = React.useState("");
  const [produtoId, setProdutoId] = React.useState("");
  const [quantidade, setQuantidade] = React.useState("");
  const [preco, setPreco] = React.useState("");
  const [desconto, setDesconto] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [saldo, setSaldo] = React.useState(null);
  const [suggestionModal, setSuggestionModal] = React.useState({
    open: false,
    mode: null,
    data: { value: null, base: null, markup: null, sourceLabel: null, loading: false, error: null },
  });

  const purchaseCacheRef = React.useRef(new Map());
  const saleCacheRef = React.useRef(new Map());

  const reservedQty = React.useMemo(() => {
    if (!Array.isArray(itens) || !produtoId) return 0;
    return itens.reduce((acc, it) => {
      if (String(it?.produto_id || "") === String(produtoId)) {
        const q = Number(it?.quantidade);
        return acc + (Number.isFinite(q) ? q : 0);
      }
      return acc;
    }, 0);
  }, [itens, produtoId]);

  const displaySaldo = React.useMemo(() => {
    if (saldo == null || !Number.isFinite(Number(saldo))) return null;
    const rem = Number(saldo) - (Number.isFinite(Number(reservedQty)) ? Number(reservedQty) : 0);
    return rem;
  }, [saldo, reservedQty]);

  function handleAdd() {
    if (!produtoId) return;
    if (!Number.isFinite(Number(quantidade)) || Number(quantidade) <= 0) return;
    if (tipo === "VENDA" && displaySaldo != null && Number.isFinite(Number(displaySaldo)) && Number(quantidade) > Number(displaySaldo)) {
      push("Quantidade maior que o estoque disponível.", { type: "warning" });
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
  }

  function openSuggestionForCompra(prod) {
    const cached = purchaseCacheRef.current.get(prod.id);
    if (cached) {
      setSuggestionModal({ open: true, mode: "COMPRA", data: { ...cached, loading: false, error: null, sourceLabel: "Último preço de compra" } });
      return;
    }
    setSuggestionModal({ open: true, mode: "COMPRA", data: { value: null, loading: true, error: null, sourceLabel: "Último preço de compra", base: null, markup: null } });
    fetchLastPurchasePrice(prod.id)
      .then((val) => {
        const normalized = val == null || !Number.isFinite(Number(val)) ? null : Number(val);
        const payload = { value: normalized };
        purchaseCacheRef.current.set(prod.id, payload);
        setSuggestionModal((prev) => ({ ...prev, data: { ...prev.data, value: normalized, loading: false } }));
      })
      .catch(() => {
        setSuggestionModal((prev) => ({ ...prev, data: { ...prev.data, value: null, loading: false, error: "Erro ao buscar último preço" } }));
      });
  }

  function openSuggestionForVenda(prod) {
    const cached = saleCacheRef.current.get(prod.id);
    if (cached) {
      setSuggestionModal({ open: true, mode: "VENDA", data: { ...cached, loading: false, error: null } });
      return;
    }
    setSuggestionModal({ open: true, mode: "VENDA", data: { value: null, base: null, markup: null, loading: true, error: null } });
    fetch(`/api/v1/estoque/saldos?produto_id=${prod.id}`, { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error || "erro saldo");
        setSaldo(Number(data.saldo));
        const custoMedio = Number(data.custo_medio);
        const ultimoCusto = Number(data.ultimo_custo);
        const base = Number.isFinite(custoMedio) && custoMedio > 0 ? custoMedio : Number.isFinite(ultimoCusto) && ultimoCusto > 0 ? ultimoCusto : null;
        const markupDefault = Number.isFinite(Number(prod.markup_percent_default)) && Number(prod.markup_percent_default) > 0 ? Number(prod.markup_percent_default) : 30;
        let suggested = null;
        if (base != null) suggested = Number((base * (1 + markupDefault / 100)).toFixed(2));
        const payload = { value: suggested, base, markup: markupDefault };
        saleCacheRef.current.set(prod.id, payload);
        setSuggestionModal((prev) => ({ ...prev, data: { ...prev.data, ...payload, loading: false } }));
      })
      .catch(() => {
        setSuggestionModal((prev) => ({ ...prev, data: { ...prev.data, loading: false, error: "Falha ao calcular preço sugerido" } }));
      });
  }

  function handleProductSelect(it) {
    setShowModal(false);
    if (!it) return;
    setProdutoId(String(it.id));
    setLabel(it.label);
    if (!quantidade) setQuantidade("1");
    if (tipo === "COMPRA") openSuggestionForCompra(it);
    if (tipo === "VENDA") openSuggestionForVenda(it);
  }

  const produtoSaldoBadge = React.useMemo(() => {
    if (tipo !== "VENDA" || !produtoId) return null;
    return displaySaldo != null ? formatQty(displaySaldo) : "…";
  }, [tipo, produtoId, displaySaldo]);

  return {
    // estados
    label, produtoId, quantidade, preco, desconto, showModal, suggestionModal, saldo,
    // derivados
    reservedQty, displaySaldo, produtoSaldoBadge,
    // setters/handlers
    setLabel, setProdutoId, setQuantidade, setPreco, setDesconto, setShowModal, setSuggestionModal,
    handleAdd, handleProductSelect,
    // externos necessários
    fetchProdutos,
  };
}

export default useQuickAddItemRowLogic;