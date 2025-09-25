import React from "react";
import { Button } from "../ui/Button";
import { SelectionModal } from "../common/SelectionModal";
import { useToast } from "../entities/shared/toast";
import { formatQty } from "./utils";

export function QuickAddItemRow({ tipo, partnerId, itens, onAppend, fetchProdutos }) {
  const { push } = useToast();
  const [label, setLabel] = React.useState("");
  const [produtoId, setProdutoId] = React.useState("");
  const [quantidade, setQuantidade] = React.useState("");
  const [preco, setPreco] = React.useState("");
  const [desconto, setDesconto] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [markupDefault, setMarkupDefault] = React.useState(null);
  const [costInfo, setCostInfo] = React.useState({
    custo_medio: null,
    ultimo_custo: null,
  });
  const [saldo, setSaldo] = React.useState(null);
  const [precoPadrao, setPrecoPadrao] = React.useState("");
  const [allowAutoPrice, setAllowAutoPrice] = React.useState(true);

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
    const rem = Number(saldo) - (Number.isFinite(Number(reservedQty)) ? Number(reservedQty) : 0);
    return rem;
  }, [saldo, reservedQty]);

  const suggestedPrice = React.useMemo(() => {
    let md = Number(markupDefault);
    if (!Number.isFinite(md) || md <= 0) md = 30;
    const cm = Number(costInfo.custo_medio);
    const uc = Number(costInfo.ultimo_custo);
    if (!Number.isFinite(md) || md < 0) return null;
    const base = Number.isFinite(cm) && cm > 0 ? cm : Number.isFinite(uc) && uc > 0 ? uc : null;
    if (!Number.isFinite(base) || base == null) return null;
    const s = base * (1 + md / 100);
    return Number(s.toFixed(2));
  }, [markupDefault, costInfo]);

  React.useEffect(() => {
    if (tipo === "VENDA" && allowAutoPrice && suggestedPrice != null) {
      setPreco(String(suggestedPrice));
    }
  }, [tipo, allowAutoPrice, suggestedPrice]);

  React.useEffect(() => {
    if (tipo === "VENDA" && allowAutoPrice && (suggestedPrice == null || !Number.isFinite(Number(suggestedPrice)))) {
      if (preco === "" && precoPadrao !== "") {
        setPreco(precoPadrao);
      }
    }
  }, [tipo, allowAutoPrice, suggestedPrice, precoPadrao, preco]);

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
              setAllowAutoPrice(false);
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
              <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
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
              const precoDefault = Number.isFinite(Number(it.preco_tabela)) ? String(it.preco_tabela) : "";
              setProdutoId(String(it.id));
              setLabel(it.label);
              setPrecoPadrao(precoDefault);
              setMarkupDefault(
                Number.isFinite(Number(it.markup_percent_default))
                  ? Number(it.markup_percent_default)
                  : null,
              );
              setAllowAutoPrice(true);
              if (!quantidade) setQuantidade("1");
              if (tipo !== "VENDA" && !preco) setPreco(precoDefault);
              if (tipo === "VENDA") {
                fetch(`/api/v1/estoque/saldos?produto_id=${it.id}`, { cache: "no-store" })
                  .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
                  .then(({ ok, data }) => {
                    if (!ok) throw new Error(data?.error || "erro saldo");
                    setCostInfo({ custo_medio: Number(data.custo_medio), ultimo_custo: Number(data.ultimo_custo) });
                    setSaldo(Number(data.saldo));
                  })
                  .catch(() => {
                    setCostInfo({ custo_medio: null, ultimo_custo: null });
                    setSaldo(null);
                  });
              }
            }
          }}
          onClose={() => setShowModal(false)}
          emptyMessage={tipo === "COMPRA" ? "Este fornecedor não possui produtos relacionados" : "Nenhum produto encontrado"}
          footer={
            tipo === "COMPRA" && Number.isFinite(Number(partnerId)) ? (
              <button
                type="button"
                className="text-xs px-2 py-1 border rounded hover:bg-[var(--color-bg-primary)]"
                onClick={() => {
                  const target = `#tab=products&linkSupplierId=${Number(partnerId)}`;
                  try {
                    window.location.hash = target;
                  } catch (_) {
                    /* noop */
                  }
                  setShowModal(false);
                }}
              >
                + Vincular produto ao fornecedor
              </button>
            ) : null
          }
        />
      )}
    </div>
  );
}
