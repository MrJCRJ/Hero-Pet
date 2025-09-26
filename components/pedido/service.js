// Service centralizado para chamadas de rede relacionadas ao fluxo de Pedido

export async function fetchSaldo(produtoId) {
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

// Retorna objeto detalhado com saldo, custo_medio e ultimo_custo (números ou null)
export async function fetchSaldoDetalhado(produtoId) {
  try {
    const res = await fetch(`/api/v1/estoque/saldos?produto_id=${produtoId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data?.error || "Falha ao buscar saldo detalhado");
    const saldo = Number(data.saldo);
    const custoMedio = Number(data.custo_medio);
    const ultimo = Number(data.ultimo_custo);
    return {
      saldo: Number.isFinite(saldo) ? saldo : null,
      custo_medio: Number.isFinite(custoMedio) ? custoMedio : null,
      ultimo_custo: Number.isFinite(ultimo) ? ultimo : null,
    };
  } catch (_) {
    return { saldo: null, custo_medio: null, ultimo_custo: null };
  }
}

// Consulta específica usando cálculo FIFO (estoque_lote) para custo médio atual
export async function fetchSaldoFifoDetalhado(produtoId) {
  try {
    const res = await fetch(
      `/api/v1/estoque/saldos_fifo?produto_id=${produtoId}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Falha ao buscar saldo FIFO");
    return {
      quantidade_total: Number.isFinite(Number(data.quantidade_total))
        ? Number(data.quantidade_total)
        : null,
      custo_medio_fifo: Number.isFinite(Number(data.custo_medio))
        ? Number(data.custo_medio)
        : null,
      valor_total: Number.isFinite(Number(data.valor_total))
        ? Number(data.valor_total)
        : null,
    };
  } catch (_) {
    return {
      quantidade_total: null,
      custo_medio_fifo: null,
      valor_total: null,
    };
  }
}

export async function fetchEntities({ q, tipo }) {
  const entityTypeParam =
    tipo === "COMPRA" ? `&entity_type=PJ` : `&entity_type=PF`;
  const url = `/api/v1/entities?q_name=${encodeURIComponent(q)}&ativo=true${entityTypeParam}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Falha na busca de entidades");
  return data.map((e) => ({
    id: e.id,
    label: `${e.name} • ${e.entity_type}`,
    name: e.name,
  }));
}

export async function fetchProdutos({ q, tipo, partnerId }) {
  const supplierFilter =
    tipo === "COMPRA" && Number.isFinite(Number(partnerId))
      ? `&supplier_id=${Number(partnerId)}`
      : "";
  const url = `/api/v1/produtos?q=${encodeURIComponent(q)}&ativo=true${supplierFilter}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Falha na busca de produtos");
  return data.map((p) => ({
    id: p.id,
    label: p.nome,
    preco_tabela: p.preco_tabela,
    markup_percent_default: p.markup_percent_default,
  }));
}

export async function updateOrder(orderId, body) {
  const res = await fetch(`/api/v1/pedidos/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Falha ao atualizar pedido");
  return data;
}

export async function createOrder(payload) {
  const res = await fetch("/api/v1/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Falha ao criar pedido");
  return data;
}

export async function deleteOrder(orderId) {
  const res = await fetch(`/api/v1/pedidos/${orderId}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Falha ao excluir pedido");
  return data;
}

export async function fetchLastPurchasePrice(produtoId) {
  try {
    const res = await fetch(
      `/api/v1/produtos/${produtoId}/last_purchase_price`,
      { cache: "no-store" },
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Falha ao buscar último preço");
    return json?.last_price != null ? Number(json.last_price) : null;
  } catch (_) {
    return null;
  }
}
