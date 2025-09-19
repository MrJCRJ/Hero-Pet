/**
 * @jest-environment node
 */
// tests/api/v1/pedidos/post-put-confirm.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

function randomDigits(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  // Reset schema for isolation
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", { method: "POST" });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha ao aplicar migrações. Status: ${mig.status}`);
  }
});

async function criaProduto(nome = "Produto Teste", preco = 10.5) {
  const resp = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, preco_tabela: preco, ativo: true }),
  });
  expect([200, 201]).toContain(resp.status);
  return await resp.json();
}

async function criaParceiroPF(nome = "Cliente PF Teste") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nome,
      entity_type: "PF",
      document_digits: randomDigits(11),
      document_pending: false,
      ativo: true,
    }),
  });
  expect([200, 201]).toContain(resp.status);
  return await resp.json();
}

// helper para PJ não é necessário neste conjunto de testes

describe("Pedidos: POST, PUT e Confirm", () => {
  test("Cria VENDA rascunho e calcula totais (201)", async () => {
    const cliente = await criaParceiroPF();
    const p1 = await criaProduto("Racao 2kg", 20);
    const p2 = await criaProduto("Areia 4kg", 15);

    const payload = {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      partner_name: cliente.name,
      itens: [
        { produto_id: p1.id, quantidade: 2, preco_unitario: 22, desconto_unitario: 2 }, // total item = (22-2)*2 = 40
        { produto_id: p2.id, quantidade: 3 }, // usa preco_tabela=15 => total=45
      ],
      observacao: "Primeira venda",
    };

    const resp = await fetch("http://localhost:3000/api/v1/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect([200, 201]).toContain(resp.status);
    const body = await resp.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("status", "rascunho");
    expect(body).toHaveProperty("total_bruto", "89.00"); // (22*2) + (15*3) = 44 + 45 = 89
    expect(body).toHaveProperty("desconto_total", "4.00");
    expect(body).toHaveProperty("total_liquido", "85.00"); // 40 + 45
  });

  test("PUT em rascunho pode mudar itens e parceiro (200)", async () => {
    const cliente = await criaParceiroPF("Cliente PF 2");
    const p1 = await criaProduto("Brinquedo", 50);

    // cria pedido inicial com 1 item
    const resp1 = await fetch("http://localhost:3000/api/v1/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "COMPRA",
        partner_entity_id: cliente.id,
        partner_name: cliente.name,
        itens: [{ produto_id: p1.id, quantidade: 1, preco_unitario: 40 }],
      }),
    });
    expect([200, 201]).toContain(resp1.status);
    const pedido = await resp1.json();

    // altera itens e parceiro
    const novoParceiro = await criaParceiroPF("Cliente PF 3");
    const p2 = await criaProduto("Shampoo", 25);
    const put = await fetch(`http://localhost:3000/api/v1/pedidos/${pedido.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_entity_id: novoParceiro.id,
        partner_name: novoParceiro.name,
        itens: [
          { produto_id: p2.id, quantidade: 2, preco_unitario: 20 }, // total bruto 40, desconto 0, líquido 40
        ],
      }),
    });
    expect(put.status).toBe(200);

    // lê para verificar totais atualizados
    const get = await fetch(`http://localhost:3000/api/v1/pedidos/${pedido.id}`);
    const body = await get.json();
    expect(body).toHaveProperty("partner_entity_id", novoParceiro.id);
    expect(body).toHaveProperty("total_bruto", "40.00");
    expect(body).toHaveProperty("desconto_total", "0.00");
    expect(body).toHaveProperty("total_liquido", "40.00");
    expect(Array.isArray(body.itens)).toBe(true);
    expect(body.itens.length).toBe(1);
  });

  test("Confirmar VENDA gera saída e bloqueia editar itens depois (200/400)", async () => {
    const cliente = await criaParceiroPF("Cliente PF 4");
    const prod = await criaProduto("Petisco", 10);

    // entrada para ter saldo
    await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto_id: prod.id, tipo: "ENTRADA", quantidade: 5, valor_unitario: 8 }),
    });

    const resp = await fetch("http://localhost:3000/api/v1/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        partner_name: cliente.name,
        itens: [{ produto_id: prod.id, quantidade: 3, preco_unitario: 12 }],
      }),
    });
    expect([200, 201]).toContain(resp.status);
    const pedido = await resp.json();

    const conf = await fetch(`http://localhost:3000/api/v1/pedidos/${pedido.id}/confirm`, { method: "POST" });
    expect(conf.status).toBe(200);

    // tentativa de editar itens após confirmação deve falhar (400)
    const put = await fetch(`http://localhost:3000/api/v1/pedidos/${pedido.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itens: [{ produto_id: prod.id, quantidade: 1 }] }),
    });
    expect(put.status).toBe(400);
  });
});
