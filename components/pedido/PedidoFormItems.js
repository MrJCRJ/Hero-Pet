import React from "react";
import { Button } from "../ui/Button";
import { FormField } from "../ui/Form";
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
  fetchProdutos
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Itens</h3>
        <Button onClick={onAddItem} variant="outline" size="sm" fullWidth={false}>
          + Adicionar item
        </Button>
      </div>

      {/* Mostrar itens removidos se houver */}
      {editingOrder && originalItens.length > 0 && (() => {
        const changes = getItemChanges();
        return changes.removed.length > 0 && (
          <div className="mb-4 p-3 border border-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              Itens removidos ({changes.removed.length}):
            </h4>
            {changes.removed.map((removedItem, idx) => (
              <div key={idx} className="text-sm text-red-700 dark:text-red-300">
                • {removedItem.produto_label || `Produto ID: ${removedItem.produto_id}`}
                - Qtd: {removedItem.quantidade}
                - Preço: R$ {Number(removedItem.preco_unitario || 0).toFixed(2)}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Lista de itens */}
      <div className="space-y-3">
        {itens.map((it, idx) => (
          <div key={idx} className={`border rounded-md p-3 bg-[var(--color-bg-primary)] ${getItemDiffClass(it) || "border-[var(--color-border)]"}`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{it.produto_label || 'Produto não selecionado'}</span>
                {getItemDiffIcon(it)}
                {tipo === 'VENDA' && Number(it.produto_id) > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    Estoque: {it.produto_saldo != null ? Number(it.produto_saldo).toFixed(3) : '...'}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                fullWidth={false}
                onClick={() => onSetProductModalIndex(idx)}
              >
                Selecionar
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <FormField
                  label="Quantidade"
                  name={`quantidade_${idx}`}
                  type="number"
                  step="0.001"
                  value={it.quantidade}
                  onChange={(e) => onUpdateItem(idx, { quantidade: e.target.value })}
                />
              </div>
              <div>
                <FormField
                  label="Preço Unitário"
                  name={`preco_unitario_${idx}`}
                  type="number"
                  step="0.01"
                  value={it.preco_unitario}
                  onChange={(e) => onUpdateItem(idx, { preco_unitario: e.target.value })}
                />
              </div>
              <div>
                <FormField
                  label="Desconto Unitário"
                  name={`desconto_unitario_${idx}`}
                  type="number"
                  step="0.01"
                  value={it.desconto_unitario}
                  onChange={(e) => onUpdateItem(idx, { desconto_unitario: e.target.value })}
                />
              </div>
              <div className="flex flex-col justify-between">
                <div className="text-center">
                  <span className="block text-xs mb-1">Total do item</span>
                  <span className="font-semibold">{(() => { const t = computeItemTotal(it); return t != null ? t.toFixed(2) : '—'; })()}</span>
                </div>
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
          </div>
        ))}
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
              onUpdateItem(targetIndex, { produto_id: String(it.id), produto_label: it.label, produto_saldo: null });
              if (tipo === 'VENDA') {
                // buscar saldo após seleção
                fetchSaldo(it.id).then((saldo) => {
                  onUpdateItem(targetIndex, { produto_saldo: saldo });
                }).catch(() => {
                  onUpdateItem(targetIndex, { produto_saldo: null });
                });
              }
            }
          }}
          onClose={() => onSetProductModalIndex(null)}
          emptyMessage={tipo === 'COMPRA' ? 'Este fornecedor não possui produtos relacionados' : 'Nenhum produto encontrado'}
          footer={tipo === 'COMPRA' && Number.isFinite(Number(partnerId)) ? (
            <button
              type="button"
              className="text-xs px-2 py-1 border rounded hover:bg-[var(--color-bg-secondary)]"
              onClick={() => {
                // Navega para Produtos com contexto de vincular fornecedor via hash
                const target = `#tab=products&linkSupplierId=${Number(partnerId)}`;
                try { window.location.hash = target; } catch (_) { /* noop */ }
                onSetProductModalIndex(null);
              }}
            >
              + Vincular produto ao fornecedor
            </button>
          ) : null}
        />
      )}
    </div>
  );
}

// Função auxiliar para buscar saldo (movida do componente principal)
async function fetchSaldo(produtoId) {
  try {
    const res = await fetch(`/api/v1/estoque/saldos?produto_id=${produtoId}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Falha ao buscar saldo");
    return Number(data.saldo);
  } catch (_) {
    return null;
  }
}