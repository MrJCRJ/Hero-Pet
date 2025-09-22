import React from "react";
import { Button } from "../ui/Button";
import { SelectionModal } from "../common/SelectionModal";

export function PedidoFormItems({
  itens,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  tipo,
  partnerId,
  computeItemTotal,
  getItemDiffClass,
  getItemDiffIcon,
  getItemChanges,
  originalItens,
  editingOrder,
  productModalIndex,
  onSetProductModalIndex,
  fetchProdutos,
}) {
  const totalItens = React.useMemo(() => {
    try {
      return (itens || []).reduce((acc, it) => {
        const t = computeItemTotal ? computeItemTotal(it) : null;
        const n = t != null && Number.isFinite(Number(t)) ? Number(t) : 0;
        return acc + n;
      }, 0);
    } catch (_) {
      return 0;
    }
  }, [itens, computeItemTotal]);
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Itens</h3>
      </div>

      {/* Quick add estilo supermercado */}
      <QuickAddItemRow
        tipo={tipo}
        partnerId={partnerId}
        itens={itens}
        onUpdateItem={onUpdateItem}
        onAddItem={onAddItem}
        onAppend={(row) => {
          const newRow = {
            produto_id: String(row.produto_id || ""),
            produto_label: row.produto_label || "",
            quantidade: String(row.quantidade || ""),
            preco_unitario: String(row.preco_unitario ?? ""),
            desconto_unitario: String(row.desconto_unitario ?? ""),
            produto_saldo: null,
          };
          // try to fill first empty placeholder
          const emptyIdx = itens.findIndex((r) => !r.produto_id);
          if (emptyIdx >= 0) {
            onUpdateItem(emptyIdx, newRow);
          } else {
            const currentLen = itens.length;
            onAddItem();
            // schedule update on next tick to ensure row exists
            setTimeout(() => onUpdateItem(currentLen, newRow), 0);
          }
        }}
        fetchProdutos={fetchProdutos}
      />

      {/* Mostrar itens removidos se houver */}
      {editingOrder &&
        originalItens.length > 0 &&
        (() => {
          const changes = getItemChanges();
          return (
            changes.removed.length > 0 && (
              <div className="mb-4 p-3 border border-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Itens removidos ({changes.removed.length}):
                </h4>
                {changes.removed.map((removedItem, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-red-700 dark:text-red-300"
                  >
                    •{" "}
                    {removedItem.produto_label ||
                      `Produto ID: ${removedItem.produto_id}`}
                    - Qtd: {removedItem.quantidade}- Preço: R${" "}
                    {Number(removedItem.preco_unitario || 0).toFixed(2)}
                  </div>
                ))}
              </div>
            )
          );
        })()}

      {/* Lista de itens estilo supermercado */}
      <div className="divide-y border rounded-md">
        {itens.map((it, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 p-2 ${getItemDiffClass(it) || ""}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {it.produto_label || "Produto não selecionado"}
                </span>
                {getItemDiffIcon(it)}
                {tipo === "VENDA" && Number(it.produto_id) > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] whitespace-nowrap">
                    Est.:{" "}
                    {it.produto_saldo != null
                      ? Number(it.produto_saldo).toFixed(3)
                      : "..."}
                  </span>
                )}
              </div>
            </div>
            <div className="w-24 text-right text-sm">
              Qtd: {String(it.quantidade || "")}
            </div>
            <div className="w-28 text-right text-sm">
              Preço:{" "}
              {it.preco_unitario !== ""
                ? `R$ ${Number(it.preco_unitario).toFixed(2)}`
                : "—"}
            </div>
            <div className="w-28 text-right text-sm">
              Desc.:{" "}
              {it.desconto_unitario !== ""
                ? `R$ ${Number(it.desconto_unitario).toFixed(2)}`
                : "—"}
            </div>
            <div className="w-28 text-right font-semibold">
              {(() => {
                const t = computeItemTotal(it);
                return t != null ? `R$ ${t.toFixed(2)}` : "—";
              })()}
            </div>
            <div className="w-24 text-right">
              <Button
                variant="secondary"
                size="sm"
                fullWidth={false}
                onClick={() => onRemoveItem(idx)}
                disabled={itens.length === 1}
              >
                Remover
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Totalizador dos itens */}
      <div className="flex justify-end mt-2">
        <div className="text-right text-sm md:text-base font-semibold">
          Total dos itens: R$ {Number(totalItens || 0).toFixed(2)}
        </div>
      </div>

      {/* Modal de seleção de produto */}
      {Number.isInteger(productModalIndex) && productModalIndex >= 0 && (
        <SelectionModal
          title="Selecionar Produto"
          fetcher={fetchProdutos}
          extractLabel={(it) => it.label}
          onSelect={(it) => {
            const targetIndex = productModalIndex;
            onSetProductModalIndex(null);
            if (it && Number.isInteger(targetIndex)) {
              onUpdateItem(targetIndex, {
                produto_id: String(it.id),
                produto_label: it.label,
                produto_saldo: null,
              });
              if (tipo === "VENDA") {
                // buscar saldo após seleção
                fetchSaldo(it.id)
                  .then((saldo) => {
                    onUpdateItem(targetIndex, { produto_saldo: saldo });
                  })
                  .catch(() => {
                    onUpdateItem(targetIndex, { produto_saldo: null });
                  });
              }
            }
          }}
          onClose={() => onSetProductModalIndex(null)}
          emptyMessage={
            tipo === "COMPRA"
              ? "Este fornecedor não possui produtos relacionados"
              : "Nenhum produto encontrado"
          }
          footer={
            tipo === "COMPRA" && Number.isFinite(Number(partnerId)) ? (
              <button
                type="button"
                className="text-xs px-2 py-1 border rounded hover:bg-[var(--color-bg-secondary)]"
                onClick={() => {
                  // Navega para Produtos com contexto de vincular fornecedor via hash
                  const target = `#tab=products&linkSupplierId=${Number(partnerId)}`;
                  try {
                    window.location.hash = target;
                  } catch (_) {
                    /* noop */
                  }
                  onSetProductModalIndex(null);
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

// Função auxiliar para buscar saldo (movida do componente principal)
async function fetchSaldo(produtoId) {
  try {
    const res = await fetch(`/api/v1/estoque/saldos?produto_id=${produtoId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Falha ao buscar saldo");
    return Number(data.saldo);
  } catch (_) {
    return null;
  }
}

function QuickAddItemRow({ tipo, partnerId, onAppend, fetchProdutos }) {
  const [label, setLabel] = React.useState("");
  const [produtoId, setProdutoId] = React.useState("");
  const [quantidade, setQuantidade] = React.useState("");
  const [preco, setPreco] = React.useState("");
  const [desconto, setDesconto] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [markupDefault, setMarkupDefault] = React.useState(null);
  const [costInfo, setCostInfo] = React.useState({ custo_medio: null, ultimo_custo: null });
  // removed loading UI; suggestion is applied silently when available
  const [precoPadrao, setPrecoPadrao] = React.useState("");
  const [allowAutoPrice, setAllowAutoPrice] = React.useState(true);

  const suggestedPrice = React.useMemo(() => {
    let md = Number(markupDefault);
    // fallback automático: se não houver markup ou for <= 0, usar 30%
    if (!Number.isFinite(md) || md <= 0) md = 30;
    const cm = Number(costInfo.custo_medio);
    const uc = Number(costInfo.ultimo_custo);
    if (!Number.isFinite(md) || md < 0) return null;
    const base = Number.isFinite(cm) && cm > 0 ? cm : Number.isFinite(uc) && uc > 0 ? uc : null;
    if (!Number.isFinite(base) || base == null) return null;
    const s = base * (1 + md / 100);
    // arredonda para 2 casas
    return Number(s.toFixed(2));
  }, [markupDefault, costInfo]);

  // auto-aplica preço sugerido quando disponível e o campo ainda estiver vazio
  React.useEffect(() => {
    if (tipo === "VENDA" && allowAutoPrice && suggestedPrice != null) {
      setPreco(String(suggestedPrice));
    }
  }, [tipo, allowAutoPrice, suggestedPrice]);

  // Fallback: se não houver sugestão por custo, usar preco_tabela padrão quando existir
  React.useEffect(() => {
    if (tipo === "VENDA" && allowAutoPrice && (suggestedPrice == null || !Number.isFinite(Number(suggestedPrice)))) {
      if (preco === "" && precoPadrao !== "") {
        setPreco(precoPadrao);
      }
    }
  }, [tipo, allowAutoPrice, suggestedPrice, precoPadrao, preco]);

  const handleAdd = () => {
    // Validar seleção de produto e quantidade
    if (!produtoId) return;
    if (!Number.isFinite(Number(quantidade)) || Number(quantidade) <= 0) return;
    onAppend({
      produto_id: produtoId,
      produto_label: label,
      quantidade,
      preco_unitario: preco,
      desconto_unitario: desconto,
    });
    setLabel("");
    setProdutoId("");
    setQuantidade("");
    setPreco("");
    setDesconto("");
  };

  return (
    <div className="mb-4 p-3 border rounded-md bg-[var(--color-bg-secondary)]">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
        <div className="md:col-span-3">
          <label className="block text-xs mb-1">Produto</label>
          <button
            type="button"
            className="w-full text-left border rounded px-2 py-1 hover:bg-[var(--color-bg-primary)]"
            onClick={() => setShowModal(true)}
          >
            {label || "Selecionar produto"}
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
            onClick={handleAdd}
          >
            + Adicionar item
          </Button>
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
              const precoDefault = Number.isFinite(Number(it.preco_tabela))
                ? String(it.preco_tabela)
                : "";
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
              // Para VENDA, preferimos preencher via sugestão (custo × markup),
              // então não aplicamos preco_tabela automaticamente.
              // Para COMPRA, mantemos o comportamento de usar preco_tabela quando vazio.
              if (tipo !== "VENDA" && !preco) setPreco(precoDefault);
              // buscar custo médio/último custo para sugestão de preço (somente VENDA)
              if (tipo === "VENDA") {
                fetch(`/api/v1/estoque/saldos?produto_id=${it.id}`, {
                  cache: "no-store",
                })
                  .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
                  .then(({ ok, data }) => {
                    if (!ok) throw new Error(data?.error || "erro saldo");
                    setCostInfo({
                      custo_medio: Number(data.custo_medio),
                      ultimo_custo: Number(data.ultimo_custo),
                    });
                  })
                  .catch(() => setCostInfo({ custo_medio: null, ultimo_custo: null }));
              }
            }
          }}
          onClose={() => setShowModal(false)}
          emptyMessage={
            tipo === "COMPRA"
              ? "Este fornecedor não possui produtos relacionados"
              : "Nenhum produto encontrado"
          }
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
