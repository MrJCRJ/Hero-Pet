import React from "react";
import { Button } from "../ui/Button";
import { SelectionModal } from "../common/SelectionModal";
import { useToast } from "../entities/shared/toast";

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
  freteTotal,
  setFreteTotal,
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
              </div>
            </div>
            <div className="w-24 text-right text-sm">
              Qtd: {formatQty(it.quantidade)}
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
            <div className="w-10 text-right">
              <Button
                variant="secondary"
                size="sm"
                fullWidth={false}
                onClick={() => onRemoveItem(idx)}
                aria-label="Remover item"
                className="px-2 py-1 text-white"
                title="Remover item"
                icon={(props) => (
                  <svg
                    {...props}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 7h12m-9 4v6m6-6v6M9 7l1-2h4l1 2m-9 0h12l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7z"
                    />
                  </svg>
                )}
              />
            </div>
          </div>
        ))}
      </div>

      {tipo === "COMPRA" && (
        <div className="flex justify-end mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Frete
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                R$
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                className="w-28 pl-6 pr-2 py-1 text-right border rounded bg-[var(--color-bg-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Frete"
                value={freteTotal}
                onChange={(e) => setFreteTotal(e.target.value)}
                onBlur={(e) => {
                  const v = String(e.target.value || "");
                  const num = Number(v.replace(",", "."));
                  if (Number.isFinite(num)) setFreteTotal(num.toFixed(2));
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end mt-3">
        <div className="text-right text-sm font-semibold">
          {(() => {
            const freteVal = tipo === "COMPRA" ? Number(freteTotal || 0) : 0;
            const total =
              Number(totalItens || 0) +
              (Number.isFinite(freteVal) ? freteVal : 0);
            return `Total: R$ ${total.toFixed(2)}`;
          })()}
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

function QuickAddItemRow({ tipo, partnerId, itens, onAppend, fetchProdutos }) {
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
  // removed loading UI; suggestion is applied silently when available
  const [precoPadrao, setPrecoPadrao] = React.useState("");
  const [allowAutoPrice, setAllowAutoPrice] = React.useState(true);

  // Quantidade já adicionada no formulário para o mesmo produto (VENDA)
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

  // Saldo exibido = saldo do backend - reservado nos itens do formulário
  const displaySaldo = React.useMemo(() => {
    if (saldo == null || !Number.isFinite(Number(saldo))) return null;
    const rem =
      Number(saldo) -
      (Number.isFinite(Number(reservedQty)) ? Number(reservedQty) : 0);
    return rem;
  }, [saldo, reservedQty]);

  const suggestedPrice = React.useMemo(() => {
    let md = Number(markupDefault);
    // fallback automático: se não houver markup ou for <= 0, usar 30%
    if (!Number.isFinite(md) || md <= 0) md = 30;
    const cm = Number(costInfo.custo_medio);
    const uc = Number(costInfo.ultimo_custo);
    if (!Number.isFinite(md) || md < 0) return null;
    const base =
      Number.isFinite(cm) && cm > 0
        ? cm
        : Number.isFinite(uc) && uc > 0
          ? uc
          : null;
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
    if (
      tipo === "VENDA" &&
      allowAutoPrice &&
      (suggestedPrice == null || !Number.isFinite(Number(suggestedPrice)))
    ) {
      if (preco === "" && precoPadrao !== "") {
        setPreco(precoPadrao);
      }
    }
  }, [tipo, allowAutoPrice, suggestedPrice, precoPadrao, preco]);

  const handleAdd = () => {
    // Validar seleção de produto e quantidade
    if (!produtoId) return;
    if (!Number.isFinite(Number(quantidade)) || Number(quantidade) <= 0) return;
    // Bloquear quando quantidade excede estoque disponível (apenas VENDA)
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
    // Mantém o produto selecionado para permitir adições repetidas
    // Atualiza apenas a quantidade (limpa para evitar repetição acidental)
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
                  .then((res) =>
                    res.json().then((data) => ({ ok: res.ok, data })),
                  )
                  .then(({ ok, data }) => {
                    if (!ok) throw new Error(data?.error || "erro saldo");
                    setCostInfo({
                      custo_medio: Number(data.custo_medio),
                      ultimo_custo: Number(data.ultimo_custo),
                    });
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

// Formata quantidade em pt-BR com até 3 casas decimais, sem zeros desnecessários
function formatQty(value) {
  if (value === "" || value == null) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
