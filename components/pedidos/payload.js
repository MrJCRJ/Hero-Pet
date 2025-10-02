// Util responsável por construir o payload base de pedido (POST/PUT)
// Mantém regra concentrada e reaproveitável (possível futuro: auto-save / draft persistence)
import { numOrNull } from './utils';

export function buildPedidoPayloadBase({
  partnerId,
  partnerName,
  observacao,
  dataEmissao,
  dataEntrega,
  temNotaFiscal,
  parcelado,
  numeroPromissorias,
  dataPrimeiraPromissoria,
  promissoriaDatas,
  itens,
  freteTotal,
  tipo,
}) {
  return {
    partner_entity_id: Number(partnerId),
    partner_name: partnerName || null,
    observacao: observacao || null,
    data_emissao: dataEmissao || null,
    data_entrega: dataEntrega || null,
    tem_nota_fiscal: temNotaFiscal,
    parcelado: parcelado,
    numero_promissorias: Number(numeroPromissorias) || 1,
    data_primeira_promissoria: dataPrimeiraPromissoria || null,
    promissoria_datas: Array.isArray(promissoriaDatas)
      ? promissoriaDatas
        .filter((s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s))
        .slice(0, Math.max(0, Number(numeroPromissorias) || 0))
      : [],
    itens: itens
      .filter(
        (it) => Number.isFinite(Number(it.produto_id)) && Number(it.quantidade) > 0,
      )
      .map((it) => ({
        produto_id: Number(it.produto_id),
        quantidade: Number(it.quantidade),
        ...(numOrNull(it.preco_unitario) != null
          ? { preco_unitario: numOrNull(it.preco_unitario) }
          : {}),
        ...(numOrNull(it.desconto_unitario) != null
          ? { desconto_unitario: numOrNull(it.desconto_unitario) }
          : {}),
      })),
    ...(tipo === 'COMPRA' &&
      numOrNull(freteTotal) != null &&
      freteTotal !== ''
      ? { frete_total: numOrNull(freteTotal) }
      : {}),
  };
}
