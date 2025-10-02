import {
  updateOrder as updateOrderService,
  createOrder as createOrderService,
  deleteOrder as deleteOrderService,
} from "./service";

export async function persistPedido({
  isEdit,
  editingOrderId,
  payloadBase,
  tipo,
  partnerId,
  observacao,
  partnerName,
  dataEmissao,
  dataEntrega,
  temNotaFiscal,
  parcelado,
  numeroPromissorias,
  dataPrimeiraPromissoria,
  migrarFifo,
}) {
  const body = {
    tipo,
    partner_entity_id: Number(partnerId),
    observacao: observacao || null,
    partner_name: partnerName || null,
    data_emissao: dataEmissao || null,
    data_entrega: dataEntrega || null,
    tem_nota_fiscal: temNotaFiscal,
    parcelado: parcelado,
    numero_promissorias: Number(numeroPromissorias) || 1,
    data_primeira_promissoria: dataPrimeiraPromissoria || null,
    promissoria_datas: payloadBase.promissoria_datas || [],
    itens: payloadBase.itens,
    ...(Object.prototype.hasOwnProperty.call(payloadBase, "frete_total")
      ? { frete_total: payloadBase.frete_total }
      : {}),
    ...(migrarFifo ? { migrar_fifo: true } : {}),
  };
  if (isEdit) {
    return updateOrderService(editingOrderId, body);
  }
  // Create: antes enviávamos somente { tipo, ...payloadBase } e backend exigia partner_entity_id etc.
  // unificamos para reutilizar a mesma estrutura (body) porém preservando itens/frete/promissorias originais.
  // body já contém campos normalizados; para manter expectativa de teste que payloadBase influencia frete_total
  // basta garantir que frete_total foi incluído acima quando presente.
  return createOrderService(body);
}

export async function excluirPedido(id) {
  return deleteOrderService(id);
}
