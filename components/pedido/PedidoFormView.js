import React from "react";
import { FormContainer } from "../ui/Form";
import { SelectionModal } from "../common/SelectionModal";
import { PedidoFormHeader } from "./PedidoFormHeader";
import { PedidoFormItems } from "./PedidoFormItems";
import { PedidoFormActions } from "./PedidoFormActions";
import { PedidoFormPromissorias } from "./PedidoFormPromissorias";

export function PedidoFormView(props) {
  const {
    // estado geral
    submitting,
    canSubmit,
    created,
    clearForm,
    // tipo e parceiro
    tipo,
    handleTipoChange,
    originalTipo,
    pendingTipo,
    confirmTipoChange,
    cancelTipoChange,
    showTypeChangeModal,
    partnerId,
    partnerLabel,
    setPartnerId,
    setPartnerLabel,
    setPartnerName,
    showPartnerModal,
    setShowPartnerModal,
    // datas e flags
    dataEmissao,
    setDataEmissao,
    dataEntrega,
    setDataEntrega,
    observacao,
    setObservacao,
    parcelado,
    setParcelado,
    // itens
    itens,
    setItens,
    updateItem,
    addItem,
    removeItem,
    originalItens,
    getItemChanges,
    getItemDiffClass,
    getItemDiffIcon,
    productModalIndex,
    setProductModalIndex,
    // promissórias
    numeroPromissorias,
    setNumeroPromissorias,
    dataPrimeiraPromissoria,
    setDataPrimeiraPromissoria,
    valorPorPromissoria,
    frequenciaPromissorias,
    setFrequenciaPromissorias,
    intervaloDiasPromissorias,
    setIntervaloDiasPromissorias,
    promissoriaDatas,
    setPromissoriaDatas,
    promissoriasMeta,
    // helpers
    computeItemTotal,
    computeOrderTotalEstimate,
    // fetchers
    fetchEntities,
    fetchProdutos,
    // ações
    handleSubmit,
    handleDelete,
    // externas
    editingOrder,
    // services
    fetchSaldoService,
  } = props;

  // Handlers estáveis
  const handleNumeroPromissoriasChange = React.useCallback(
    (n) => {
      setNumeroPromissorias(n);
      // O controller recalcula valorPorPromissoria em efeito, então não precisamos setar aqui
    },
    [setNumeroPromissorias],
  );

  return (
    <FormContainer title="Pedido (MVP)" onSubmit={handleSubmit}>
      <PedidoFormHeader
        tipo={tipo}
        onTipoChange={handleTipoChange}
        dataEmissao={dataEmissao}
        onDataEmissaoChange={setDataEmissao}
        partnerLabel={partnerLabel}
        onPartnerSelect={(it) => {
          setShowPartnerModal(false);
          if (it) {
            setPartnerId(String(it.id));
            setPartnerLabel(it.label);
            setPartnerName(it.name || it.label);
          }
        }}
        observacao={observacao}
        onObservacaoChange={setObservacao}
        dataEntrega={dataEntrega}
        onDataEntregaChange={setDataEntrega}
        showPartnerModal={showPartnerModal}
        onShowPartnerModal={setShowPartnerModal}
        fetchEntities={fetchEntities}
        showTypeChangeModal={showTypeChangeModal}
        originalTipo={originalTipo}
        pendingTipo={pendingTipo}
        onConfirmTipoChange={confirmTipoChange}
        onCancelTipoChange={cancelTipoChange}
      />

      <PedidoFormItems
        itens={itens}
        onUpdateItem={updateItem}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        tipo={tipo}
        partnerId={partnerId}
        computeItemTotal={computeItemTotal}
        getItemDiffClass={getItemDiffClass}
        getItemDiffIcon={getItemDiffIcon}
        getItemChanges={getItemChanges}
        originalItens={originalItens}
        editingOrder={editingOrder}
        productModalIndex={productModalIndex}
        onSetProductModalIndex={setProductModalIndex}
        fetchProdutos={fetchProdutos}
      />

      <PedidoFormPromissorias
        parcelado={parcelado}
        onParceladoChange={setParcelado}
        numeroPromissorias={numeroPromissorias}
        onNumeroPromissoriasChange={handleNumeroPromissoriasChange}
        dataPrimeiraPromissoria={dataPrimeiraPromissoria}
        onDataPrimeiraPromissoriasChange={setDataPrimeiraPromissoria}
        valorPorPromissoria={valorPorPromissoria}
        totalLiquido={computeOrderTotalEstimate()}
        frequenciaPromissorias={frequenciaPromissorias}
        onFrequenciaPromissoriasChange={setFrequenciaPromissorias}
        intervaloDiasPromissorias={intervaloDiasPromissorias}
        onIntervaloDiasPromissoriasChange={setIntervaloDiasPromissorias}
        promissoriaDatas={promissoriaDatas}
        onPromissoriaDatasChange={setPromissoriaDatas}
        promissoriasMeta={promissoriasMeta}
      />

      <PedidoFormActions
        created={created}
        editingOrder={editingOrder}
        onDelete={handleDelete}
        onClear={clearForm}
        canSubmit={canSubmit}
        submitting={submitting}
      />

      {Number.isInteger(productModalIndex) && productModalIndex >= 0 && (
        <SelectionModal
          title="Selecionar Produto"
          fetcher={fetchProdutos}
          extractLabel={(it) => it.label}
          onSelect={(it) => {
            const targetIndex = productModalIndex;
            setProductModalIndex(null);
            if (it && Number.isInteger(targetIndex)) {
              updateItem(targetIndex, {
                produto_id: String(it.id),
                produto_label: it.label,
                produto_saldo: null,
              });
              if (tipo === "VENDA") {
                fetchSaldoService(it.id)
                  .then((saldo) => {
                    setItens((prev) =>
                      prev.map((row, i) =>
                        i === targetIndex
                          ? { ...row, produto_saldo: saldo }
                          : row,
                      ),
                    );
                  })
                  .catch(() => {
                    setItens((prev) =>
                      prev.map((row, i) =>
                        i === targetIndex
                          ? { ...row, produto_saldo: null }
                          : row,
                      ),
                    );
                  });
              }
            }
          }}
          onClose={() => setProductModalIndex(null)}
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
                  const target = `#tab=products&linkSupplierId=${Number(partnerId)}`;
                  try {
                    window.location.hash = target;
                  } catch (_) {
                    /* noop */
                  }
                  setProductModalIndex(null);
                }}
              >
                + Vincular produto ao fornecedor
              </button>
            ) : null
          }
        />
      )}
    </FormContainer>
  );
}
