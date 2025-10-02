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
    produto_label: it.produto_nome || it.produto_label || "",
    quantidade: String(it.quantidade),
    preco_unitario: it.preco_unitario != null ? String(it.preco_unitario) : "",
    desconto_unitario:
      it.desconto_unitario != null ? String(it.desconto_unitario) : "",
    produto_saldo: null,
    // Preserva custos se fornecidos (para testes ou reedição com custos calculados)
    ...(it.custo_fifo_unitario != null
      ? { custo_fifo_unitario: it.custo_fifo_unitario }
      : {}),
    ...(it.custo_base_unitario != null
      ? { custo_base_unitario: it.custo_base_unitario }
      : {}),
    // Backfill forma numérica padrão se vierem como string
    ...(it.custo_fifo_unitario == null && it.custo_base_unitario == null
      ? {}
      : {
          custo_fifo_unitario:
            it.custo_fifo_unitario != null
              ? Number(it.custo_fifo_unitario)
              : it.custo_fifo_unitario,
          custo_base_unitario:
            it.custo_base_unitario != null
              ? Number(it.custo_base_unitario)
              : it.custo_base_unitario,
        }),
  }));
}

/**
 * Cria item vazio padrão
 */
export function defaultEmptyItem() {
  return {
    produto_id: "",
    produto_label: "",
    quantidade: "",
    preco_unitario: "",
    desconto_unitario: "",
    produto_saldo: null,
  };
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

/**
 * Formata quantidade em pt-BR com até 3 casas decimais, sem zeros desnecessários
 * Mantém string vazia quando input também é vazio/indefinido, e retorna o valor original
 * quando não é número válido.
 */
export function formatQty(value) {
  if (value === "" || value == null) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

/**
 * Soma total (itens) do pedido usando computeItemTotal. Retorna 0 em falhas.
 */
export function computeTotalItens(itens) {
  try {
    return (itens || []).reduce((acc, it) => {
      const t = computeItemTotal(it);
      return acc + (Number.isFinite(t) ? Number(t) : 0);
    }, 0);
  } catch (_) {
    return 0;
  }
}

/**
 * Calcula lucro bruto aproximado por item (usa custo_fifo_unitario preferencialmente, fallback custo_base_unitario)
 * Retorna objeto { totalLucro, detalhes } para possíveis diagnósticos futuros.
 */
export function computeLucroBruto(itens) {
  let totalLucro = 0;
  const detalhes = [];
  (itens || []).forEach((it) => {
    try {
      const totalItem = computeItemTotal(it);
      if (!Number.isFinite(totalItem)) return;
      const custoUnit = Number.isFinite(it.custo_fifo_unitario)
        ? Number(it.custo_fifo_unitario)
        : Number.isFinite(it.custo_base_unitario)
          ? Number(it.custo_base_unitario)
          : null;
      if (!Number.isFinite(custoUnit) || custoUnit < 0) return;
      const qtd = Number(it.quantidade);
      if (!Number.isFinite(qtd) || qtd <= 0) return;
      const custoTotal = custoUnit * qtd;
      const lucro = totalItem - custoTotal;
      totalLucro += lucro;
      detalhes.push({
        produto_id: it.produto_id,
        lucro,
        totalItem,
        custoTotal,
      });
    } catch (_) {
      /* ignore item */
    }
  });
  return { totalLucro: Number(totalLucro), detalhes };
}

/**
 * Dado um array de percentuais e base (ex: total da venda), retorna valores calculados.
 */
export function computeComissoes(base, percentuais) {
  const b = Number(base) || 0;
  return (percentuais || []).map((p) => {
    const pn = Number(p);
    if (!Number.isFinite(pn) || pn <= 0) return 0;
    return Number(((b * pn) / 100).toFixed(2));
  });
}

/**
 * Calcula margens pós comissão: (lucroBruto - comissao) / totalVenda * 100.
 * Retorna array de números (percentuais) com mesma ordem dos percentuais.
 */
export function computeMargensPosComissao(lucroBruto, totalVenda, comissoes) {
  const tv = Number(totalVenda);
  if (!Number.isFinite(tv) || tv <= 0) return comissoes.map(() => null);
  return comissoes.map((c) => {
    const ln = Number(lucroBruto) - Number(c || 0);
    if (!Number.isFinite(ln)) return null;
    return Number(((ln / tv) * 100).toFixed(2));
  });
}

/**
 * Distribui frete proporcional à quantidade de cada item.
 * Mantém soma final ajustada para bater exatamente com o total (corrige arredondamento).
 * @param {Array} itens
 * @param {number|string} freteTotal
 * @returns {number[]} array alinhado com itens
 */
export function computeFreteShares(itens, freteTotal) {
  const totalFrete = Number(freteTotal || 0);
  if (!Array.isArray(itens) || itens.length === 0) return [];
  if (!Number.isFinite(totalFrete) || totalFrete <= 0)
    return itens.map(() => 0);
  const quants = itens.map((it) => {
    const qtd = Number(it?.quantidade);
    return Number.isFinite(qtd) && qtd > 0 ? qtd : 0;
  });
  const sumQtd = quants.reduce(
    (acc, q) => acc + (Number.isFinite(q) ? q : 0),
    0,
  );
  if (!Number.isFinite(sumQtd) || sumQtd <= 0) return itens.map(() => 0);
  const raw = quants.map((q) => (q > 0 ? (totalFrete * q) / sumQtd : 0));
  const rounded = raw.map((v) => Number(v.toFixed(2)));
  const sumRounded = rounded.reduce((a, b) => a + b, 0);
  let diff = Number((totalFrete - sumRounded).toFixed(2));
  if (diff !== 0) {
    let idx = 0;
    let maxQtd = -Infinity;
    for (let i = 0; i < quants.length; i++) {
      if (quants[i] > maxQtd) {
        maxQtd = quants[i];
        idx = i;
      }
    }
    rounded[idx] = Number((rounded[idx] + diff).toFixed(2));
  }
  return rounded;
}
