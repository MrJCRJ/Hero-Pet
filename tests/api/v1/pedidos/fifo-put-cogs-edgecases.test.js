/**
 * @jest-environment node
 */
// tests/api/v1/pedidos/fifo-put-cogs-edgecases.test.js
// Edge cases para PUT FIFO:
//  (A) Pedido criado em modo legacy (sem lotes existentes) depois surgem lotes e aumenta quantidade -> itens legacy permanecem sem custo reconhecido; novos permanecem fallback até lotes existirem.
//  (B) Redução libera lotes e outro item (produto diferente) aumenta consumindo seus próprios lotes sem interferência.
//  (C) PUT sem enviar itens não deve recriar movimentos.

const BASE_URL = "http://localhost:3000";
async function api(method, path, body, expectOk = true) {
  const headers = { "Content-Type": "application/json" };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (expectOk && !res.ok)
    throw new Error(
      `API ${method} ${path} failed: ${res.status} ${JSON.stringify(data)}`,
    );
  return { status: res.status, data };
}
function digits(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}
async function criaEntidadePF(nome) {
  return (
    await api("POST", "/api/v1/entities", {
      name: nome,
      entity_type: "PF",
      document_digits: digits(11),
      ativo: true,
    })
  ).data;
}
async function criaEntidadePJ(nome) {
  return (
    await api("POST", "/api/v1/entities", {
      name: nome,
      entity_type: "PJ",
      document_digits: digits(14),
      ativo: true,
    })
  ).data;
}
async function criaProduto(nome, preco = 100) {
  const forn = await criaEntidadePJ("FORN EDGE");
  return (
    await api("POST", "/api/v1/produtos", {
      nome,
      preco_tabela: preco,
      ativo: true,
      fornecedor_id: forn.id,
    })
  ).data;
}
async function entrada(produtoId, qtd, valorUnit, doc) {
  return api("POST", "/api/v1/estoque/movimentos", {
    produto_id: produtoId,
    tipo: "ENTRADA",
    quantidade: qtd,
    valor_unitario: valorUnit,
    documento: doc,
    fifo_enabled: 1,
  });
}
async function getPedido(id) {
  return api("GET", `/api/v1/pedidos/${id}`);
}

describe("PUT Pedido VENDA - FIFO Edge Cases", () => {
  let cliente;
  beforeAll(async () => {
    await api("POST", "/api/v1/migrations");
    cliente = await criaEntidadePF("Cliente Edge");
  });

  test("(A) Pedido criado legacy (sem lotes) depois aumento com lotes não retroage custos anteriores", async () => {
    const prod = await criaProduto("Prod Legacy First");
    // Nenhum lote ainda => fallback legacy permitido se saldo agregado suficiente (zero entradas => saldo=0 -> não permitir). Criamos movimento entrada legado (sem fifo_enabled) para simular estoque pré-FIFO.
    await api("POST", "/api/v1/estoque/movimentos", {
      produto_id: prod.id,
      tipo: "ENTRADA",
      quantidade: 5,
      valor_unitario: 8,
      documento: "LEG",
    });
    const pedido = (
      await api("POST", "/api/v1/pedidos", {
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        itens: [{ produto_id: prod.id, quantidade: 3, preco_unitario: 30 }],
      })
    ).data;
    const before = await getPedido(pedido.id);
    const itemBefore = before.data.itens[0];
    expect(itemBefore.custo_total_item).not.toBeNull();
    // Agora criamos lotes FIFO novos
    await entrada(prod.id, 4, 12, "L-FIFO");
    // Aumentar quantidade para 5 deve falhar (400) porque existem lotes (4) porém insuficientes para atender total pretendido; não permitimos mescla legado+parcial FIFO.
    const put = await api(
      "PUT",
      `/api/v1/pedidos/${pedido.id}`,
      { itens: [{ produto_id: prod.id, quantidade: 5, preco_unitario: 30 }] },
      false,
    );
    expect(put.status).toBe(400);
    const after = await getPedido(pedido.id); // permanece quantidade 3
    const itemAfter = after.data.itens.find((i) => i.produto_id === prod.id);
    expect(Number(itemAfter.quantidade)).toBe(3);
    expect(Number(itemAfter.custo_total_item)).toBe(
      Number(itemBefore.custo_total_item),
    );
  });

  test("(B) Redução libera lotes e outro produto aumenta sem interferência", async () => {
    const prodA = await criaProduto("Prod A EC");
    const prodB = await criaProduto("Prod B EC");
    await entrada(prodA.id, 5, 5, "LA1");
    await entrada(prodB.id, 3, 7, "LB1");
    // Pedido inicial consumindo parcialmente A e B
    const ped = (
      await api("POST", "/api/v1/pedidos", {
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        itens: [
          { produto_id: prodA.id, quantidade: 4, preco_unitario: 20 },
          { produto_id: prodB.id, quantidade: 2, preco_unitario: 15 },
        ],
      })
    ).data;
    // Reduz A para 2 (devolve 2 unidades ao lote A) e aumenta B para 3 (consome 1 de B)
    const put = await api(
      "PUT",
      `/api/v1/pedidos/${ped.id}`,
      {
        itens: [
          { produto_id: prodA.id, quantidade: 2, preco_unitario: 20 },
          { produto_id: prodB.id, quantidade: 3, preco_unitario: 15 },
        ],
      },
      false,
    );
    expect(put.status).toBe(200);
    const after = await getPedido(ped.id);
    const itemA = after.data.itens.find((i) => i.produto_id === prodA.id);
    const itemB = after.data.itens.find((i) => i.produto_id === prodB.id);
    expect(Number(itemA.custo_total_item)).toBe(10); // 2 * 5
    expect(Number(itemB.custo_total_item)).toBe(21); // 3 * 7
  });

  test("(C) PUT sem itens não recria movimentos", async () => {
    const prod = await criaProduto("Prod Sem Itens");
    await entrada(prod.id, 3, 9, "LC1");
    const ped = (
      await api("POST", "/api/v1/pedidos", {
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        itens: [{ produto_id: prod.id, quantidade: 2, preco_unitario: 25 }],
      })
    ).data;
    const movsBefore = await api(
      "GET",
      `/api/v1/estoque/movimentos?produto_id=${prod.id}`,
    );
    const put = await api(
      "PUT",
      `/api/v1/pedidos/${ped.id}`,
      { observacao: "apenas atualizar campo" },
      false,
    );
    expect(put.status).toBe(200);
    const movsAfter = await api(
      "GET",
      `/api/v1/estoque/movimentos?produto_id=${prod.id}`,
    );
    expect(movsAfter.data.length).toBe(movsBefore.data.length); // nenhuma mudança
  });
});
