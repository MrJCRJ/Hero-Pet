// Utils puros para Pedido (reaproveitáveis)

/**
 * Converte valor para número ou null quando vazio/indefinido/inválido
 * @param {any} v
 * @returns {number|null}
 */
export function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Mapeia itens do pedido em edição para o shape do formulário
 * @param {object} editingOrder
 * @returns {Array<{produto_id:string, produto_label:string, quantidade:string, preco_unitario:string, desconto_unitario:string, produto_saldo:number|null}>}
 */
export function mapEditingOrderToItems(editingOrder) {
  if (!editingOrder || !Array.isArray(editingOrder.itens)) return [];
  return editingOrder.itens.map((it) => ({
    produto_id: String(it.produto_id),
    produto_label: it.produto_nome || "",
    quantidade: String(it.quantidade),
    preco_unitario: it.preco_unitario != null ? String(it.preco_unitario) : "",
    desconto_unitario: it.desconto_unitario != null ? String(it.desconto_unitario) : "",
    produto_saldo: null,
  }));
}

/**
 * Cria item vazio padrão
 */
export function defaultEmptyItem() {
  return { produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "", produto_saldo: null };
}

/**
 * Calcula total de um item a partir de quantidade, preço e desconto
 * Retorna null quando dados insuficientes
 */
export function computeItemTotal(it) {
  const qtd = Number(it.quantidade);
  const preco = numOrNull(it.preco_unitario);
  const desc = numOrNull(it.desconto_unitario) || 0;
  if (!Number.isFinite(qtd) || !Number.isFinite(preco)) return null;
  const total = (preco - desc) * qtd;
  return Number.isFinite(total) ? total : null;
}
