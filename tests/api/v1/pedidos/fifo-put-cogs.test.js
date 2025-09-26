/**
 * @jest-environment node
 */

// tests/api/v1/pedidos/fifo-put-cogs.test.js
// RED: cobrimos comportamento esperado de edição (PUT) de pedidos VENDA sob FIFO.
// Objetivos:
//  (1) Aumentar quantidade de item deve consumir lotes adicionais e recalcular custo.
//  (2) Reduzir quantidade deve liberar ("devolver") consumo anterior (saldo em lotes aumenta) e custo do item ajusta.
//  (3) Aumentar acima do saldo disponível => 400 e não altera registros.
//  (4) Múltiplos itens independentes (isolamento de consumo).
// Implementação futura deve: apagar movimentos SAIDA anteriores do pedido, reconstituir consumos FIFO e atualizar pedido_itens.

const BASE_URL = "http://localhost:3000";
async function api(method, path, body, expectOk = true) {
  const headers = { "Content-Type": "application/json" };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (expectOk && !res.ok) {
    throw new Error(
      `API ${method} ${path} failed: ${res.status} ${JSON.stringify(data)}`,
    );
  }
  return { status: res.status, data };
}

function randomDigits(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}
async function criaEntidadePF(nome) {
  const { data } = await api("POST", "/api/v1/entities", {
    name: nome,
    entity_type: "PF",
    document_digits: randomDigits(11),
    ativo: true,
  });
  return data;
}
async function criaEntidadePJ(nome) {
  const { data } = await api("POST", "/api/v1/entities", {
    name: nome,
    entity_type: "PJ",
    document_digits: randomDigits(14),
    ativo: true,
  });
  return data;
}
async function criaProduto(nome, preco = 100) {
  const forn = await criaEntidadePJ("FORN FIFO PUT");
  const { data } = await api("POST", "/api/v1/produtos", {
    nome,
    preco_tabela: preco,
    ativo: true,
    fornecedor_id: forn.id,
  });
  return data;
}
async function entradaFIFO(produtoId, quantidade, valorUnit, doc) {
  return api("POST", "/api/v1/estoque/movimentos", {
    produto_id: produtoId,
    tipo: "ENTRADA",
    quantidade,
    valor_unitario: valorUnit,
    documento: doc,
    fifo_enabled: 1,
  });
}

async function getPedido(id) {
  return api("GET", `/api/v1/pedidos/${id}`);
}

describe("PUT Pedido VENDA - FIFO COGS (RED)", () => {
  let cliente, produto;
  beforeAll(async () => {
    await api("POST", "/api/v1/migrations", null, true);
    cliente = await criaEntidadePF("Cliente PUT FIFO");
    produto = await criaProduto("Produto PUT FIFO", 150);
  });

  test("(1) Aumentar quantidade consome lote adicional e recalcula custo", async () => {
    await entradaFIFO(produto.id, 3, 10, "L1");
    await entradaFIFO(produto.id, 4, 14, "L2");
    const { data: pedido } = await api("POST", "/api/v1/pedidos", {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      itens: [{ produto_id: produto.id, quantidade: 2, preco_unitario: 40 }],
    });
    const original = await getPedido(pedido.id);
    const item0 = original.data.itens[0];
    expect(Number(item0.custo_total_item)).toBe(20); // 2 * 10

    // Aumentar para 5 => consumo restante: 1 do primeiro lote (total 3) + 2 do segundo lote (custo 14) => custo total esperado 3*10 + 2*14 = 58
    const put = await api(
      "PUT",
      `/api/v1/pedidos/${pedido.id}`,
      {
        itens: [{ produto_id: produto.id, quantidade: 5, preco_unitario: 40 }],
      },
      false,
    );
    // Atualmente falha porque PUT ainda não reprocessa FIFO, esperamos status 200 futuramente com custo recalculado -> RED definindo expectativa final
    // Quando implementado: expect(put.status).toBe(200) e depois GET confirmar novo custo.
    expect(put.status).toBe(200); // <- Este deve falhar agora (status real 200 ou 400 dependendo fluxo), ajustaremos após implementação se necessário
    const after = await getPedido(pedido.id);
    const itemAfter = after.data.itens[0];
    expect(Number(itemAfter.custo_total_item)).toBe(58); // RED
    expect(Number(itemAfter.custo_unit_venda)).toBeCloseTo(11.6, 2); // 58/5 = 11.6
  });

  test("(2) Reduzir quantidade libera custo e ajusta média", async () => {
    // Usa produto isolado para evitar interferência de lotes remanescentes do teste (1)
    const prodIsolado = await criaProduto("Produto PUT FIFO R2", 150);
    await entradaFIFO(prodIsolado.id, 3, 10, "L1-R2");
    await entradaFIFO(prodIsolado.id, 4, 14, "L2-R2");
    const pedido = (
      await api("POST", "/api/v1/pedidos", {
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        itens: [
          { produto_id: prodIsolado.id, quantidade: 5, preco_unitario: 40 },
        ],
      })
    ).data; // custo previsto 3*10 + 2*14 = 58
    const put = await api(
      "PUT",
      `/api/v1/pedidos/${pedido.id}`,
      {
        itens: [
          { produto_id: prodIsolado.id, quantidade: 3, preco_unitario: 40 },
        ],
      },
      false,
    );
    expect(put.status).toBe(200); // RED (PUT não refaz custo)
    const after = await getPedido(pedido.id);
    const item = after.data.itens.find((i) => i.produto_id === prodIsolado.id);
    // Redução para 3 deve resultar em custo 3*10 = 30 (como se só primeiro lote consumido)
    expect(Number(item.custo_total_item)).toBe(30); // RED
    expect(Number(item.custo_unit_venda)).toBe(10); // RED
  });

  test("(3) Aumentar acima do saldo disponível retorna 400 e não altera itens", async () => {
    // Preparar pedido com 2 unidades (saldo total lotes = 3+4=7). Tentamos subir para 10 (>7) => 400.
    const pedido = (
      await api("POST", "/api/v1/pedidos", {
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        itens: [{ produto_id: produto.id, quantidade: 2, preco_unitario: 40 }],
      })
    ).data; // custo 20
    const before = await getPedido(pedido.id);
    const put = await api(
      "PUT",
      `/api/v1/pedidos/${pedido.id}`,
      {
        itens: [{ produto_id: produto.id, quantidade: 10, preco_unitario: 40 }],
      },
      false,
    );
    expect(put.status).toBe(400); // RED
    const after = await getPedido(pedido.id);
    expect(Number(after.data.itens[0].quantidade)).toBe(
      Number(before.data.itens[0].quantidade),
    );
    expect(Number(after.data.itens[0].custo_total_item)).toBe(
      Number(before.data.itens[0].custo_total_item),
    );
  });

  test("(4) Múltiplos itens independentes", async () => {
    const prodB = await criaProduto("Produto B PUT FIFO", 120);
    await entradaFIFO(produto.id, 2, 20, "L3");
    await entradaFIFO(prodB.id, 3, 5, "LB1");

    const pedido = (
      await api("POST", "/api/v1/pedidos", {
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        itens: [
          { produto_id: produto.id, quantidade: 2, preco_unitario: 50 }, // consumo esperado: pode pegar remanescente de lotes anteriores (variável conforme execuções anteriores)
          { produto_id: prodB.id, quantidade: 2, preco_unitario: 25 }, // custo esperado 2*5 = 10
        ],
      })
    ).data;

    // PUT aumenta apenas prodB para 3 (consome mais 1 de custo 5) e reduz produto A para 1
    const put = await api(
      "PUT",
      `/api/v1/pedidos/${pedido.id}`,
      {
        itens: [
          { produto_id: produto.id, quantidade: 1, preco_unitario: 50 },
          { produto_id: prodB.id, quantidade: 3, preco_unitario: 25 },
        ],
      },
      false,
    );
    expect(put.status).toBe(200); // RED
    const after = await getPedido(pedido.id);
    const itemB = after.data.itens.find((i) => i.produto_id === prodB.id);
    // Item B custo total esperado 3*5 = 15
    expect(Number(itemB.custo_total_item)).toBe(15); // RED
  });
});
