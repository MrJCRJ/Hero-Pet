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
