import React from "react";
import { PedidoFormView } from "./pedido/PedidoFormView";
import { usePedidoFormController } from "./pedido/usePedidoFormController";
import { fetchSaldo as fetchSaldoService } from "./pedido/service";

export function PedidoForm(props) {
  const controller = usePedidoFormController(props);
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
    editingOrder,
    freteTotal,
    setFreteTotal,
    fifoAplicado,
    migrarFifo,
    setMigrarFifo,
  } = controller;

  return (
    <PedidoFormView
      // estado geral
      submitting={submitting}
      canSubmit={canSubmit}
      created={created}
      clearForm={clearForm}
      // tipo e parceiro
      tipo={tipo}
      handleTipoChange={handleTipoChange}
      originalTipo={originalTipo}
      pendingTipo={pendingTipo}
      confirmTipoChange={confirmTipoChange}
      cancelTipoChange={cancelTipoChange}
      showTypeChangeModal={showTypeChangeModal}
      partnerId={partnerId}
      partnerLabel={partnerLabel}
      setPartnerId={setPartnerId}
      setPartnerLabel={setPartnerLabel}
      setPartnerName={setPartnerName}
      showPartnerModal={showPartnerModal}
      setShowPartnerModal={setShowPartnerModal}
      // datas e flags
      dataEmissao={dataEmissao}
      setDataEmissao={setDataEmissao}
      dataEntrega={dataEntrega}
      setDataEntrega={setDataEntrega}
      observacao={observacao}
      setObservacao={setObservacao}
      parcelado={parcelado}
      setParcelado={setParcelado}
      // itens
      itens={itens}
      setItens={setItens}
      updateItem={updateItem}
      addItem={addItem}
      removeItem={removeItem}
      originalItens={originalItens}
      getItemChanges={getItemChanges}
      getItemDiffClass={getItemDiffClass}
      getItemDiffIcon={getItemDiffIcon}
      productModalIndex={productModalIndex}
      setProductModalIndex={setProductModalIndex}
      // promissórias
      numeroPromissorias={numeroPromissorias}
      setNumeroPromissorias={setNumeroPromissorias}
      dataPrimeiraPromissoria={dataPrimeiraPromissoria}
      setDataPrimeiraPromissoria={setDataPrimeiraPromissoria}
      valorPorPromissoria={valorPorPromissoria}
      frequenciaPromissorias={frequenciaPromissorias}
      setFrequenciaPromissorias={setFrequenciaPromissorias}
      intervaloDiasPromissorias={intervaloDiasPromissorias}
      setIntervaloDiasPromissorias={setIntervaloDiasPromissorias}
      promissoriaDatas={promissoriaDatas}
      setPromissoriaDatas={setPromissoriaDatas}
      promissoriasMeta={promissoriasMeta}
      // helpers
      computeItemTotal={computeItemTotal}
      computeOrderTotalEstimate={computeOrderTotalEstimate}
      // fetchers
      fetchEntities={fetchEntities}
      fetchProdutos={fetchProdutos}
      // ações
      handleSubmit={handleSubmit}
      handleDelete={handleDelete}
      // externas
      editingOrder={editingOrder}
      // services
      fetchSaldoService={fetchSaldoService}
      freteTotal={freteTotal}
      setFreteTotal={setFreteTotal}
      fifoAplicado={fifoAplicado}
      migrarFifo={migrarFifo}
      setMigrarFifo={setMigrarFifo}
    />
  );
}
