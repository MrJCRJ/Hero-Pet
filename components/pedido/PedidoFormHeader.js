import React from "react";
import { Button } from "../ui/Button";
import { FormField } from "../ui/Form";
import { SelectionModal } from "../common/SelectionModal";

export function PedidoFormHeader({
  tipo,
  onTipoChange,
  dataEmissao,
  onDataEmissaoChange,
  partnerLabel,
  onPartnerSelect,
  observacao,
  onObservacaoChange,
  dataEntrega,
  onDataEntregaChange,
  temNotaFiscal,
  onTemNotaFiscalChange,
  parcelado,
  onParceladoChange,
  showPartnerModal,
  onShowPartnerModal,
  fetchEntities,
  showTypeChangeModal,
  originalTipo,
  pendingTipo,
  onConfirmTipoChange,
  onCancelTipoChange
}) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs mb-1 text-[var(--color-text-secondary)]">Tipo</label>
          <select
            className=" border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg-primary)]"
            value={tipo}
            onChange={(e) => onTipoChange(e.target.value)}
          >
            <option value="VENDA">VENDA</option>
            <option value="COMPRA">COMPRA</option>
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1 text-[var(--color-text-secondary)]">Data do Pedido</label>
          <input
            type="date"
            className=" border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg-primary)]"
            value={dataEmissao}
            onChange={(e) => onDataEmissaoChange(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs mb-1 text-[var(--color-text-secondary)]">Cliente/Fornecedor (ativo)</label>
          <div className="flex items-center gap-2">
            <div className=" text-sm px-2 py-1 rounded   min-h-[50px]">
              {partnerLabel || <span className="opacity-60">Nenhum selecionado</span>}
            </div>
            <Button variant="outline" size="sm" fullWidth={false} onClick={() => onShowPartnerModal(true)}>
              Buscar...
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
        <div>
          <FormField
            label="Data de Entrega"
            name="data_entrega"
            type="date"
            value={dataEntrega}
            onChange={(e) => onDataEntregaChange(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={temNotaFiscal} onChange={(e) => onTemNotaFiscalChange(e.target.checked)} />
          Tem Nota Fiscal
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={parcelado} onChange={(e) => onParceladoChange(e.target.checked)} />
          Parcelado
        </label>
        <div className="md:col-span-3">
          <FormField
            label="Observação"
            name="observacao"
            value={observacao}
            onChange={(e) => onObservacaoChange(e.target.value)}
          />
        </div>
      </div>

      {/* Modal de seleção de parceiro */}
      {showPartnerModal && (
        <SelectionModal
          title="Selecionar Cliente/Fornecedor"
          fetcher={fetchEntities}
          extractLabel={(it) => it.label}
          onSelect={onPartnerSelect}
          onClose={() => onShowPartnerModal(false)}
          emptyMessage={tipo === 'VENDA' ? 'Nenhum cliente ativo encontrado' : 'Nenhum fornecedor ativo encontrado'}
        />
      )}

      {/* Modal de confirmação de mudança de tipo */}
      {showTypeChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirmar mudança de tipo</h3>
            <div className="mb-4 text-sm">
              <p className="mb-2">
                Você está alterando o tipo de <strong>{originalTipo}</strong> para <strong>{pendingTipo}</strong>.
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                ⚠️ Esta mudança irá:
                <br />• Limpar a seleção de cliente/fornecedor
                <br />• Reprocessar movimentos de estoque
                <br />• Alterar as regras de negócio aplicáveis
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={onCancelTipoChange} variant="outline" size="sm" fullWidth={false}>
                Cancelar
              </Button>
              <Button onClick={onConfirmTipoChange} variant="primary" size="sm" fullWidth={false}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}