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
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha ao aplicar migrações. Status: ${mig.status}`);
  }
});

async function criaProduto(nome = "Produto Teste", preco = 10.5) {
  // garante fornecedor PJ obrigatório
  const forn = await criaParceiroPJ("FORN PEDIDOS");
  const resp = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome,
      preco_tabela: preco,
      ativo: true,
      fornecedor_id: forn.id,
    }),
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
async function criaParceiroPJ(nome = "Fornecedor Teste") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, entity_type: "PJ" }),
  });
  expect([200, 201]).toContain(resp.status);
  return await resp.json();
}

describe("Pedidos: POST, PUT e Confirm", () => {
  test("Cria VENDA confirmado e calcula totais (201)", async () => {
    const cliente = await criaParceiroPF();
    const p1 = await criaProduto("Racao 2kg", 20);
    const p2 = await criaProduto("Areia 4kg", 15);

    // entrada para garantir saldo suficiente
    await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produto_id: p1.id,
        tipo: "ENTRADA",
        quantidade: 2,
        valor_unitario: 18,
      }),
    });
    await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produto_id: p2.id,
        tipo: "ENTRADA",
        quantidade: 3,
        valor_unitario: 12,
      }),
    });

    const payload = {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      partner_name: cliente.name,
      itens: [
        {
          produto_id: p1.id,
          quantidade: 2,
          preco_unitario: 22,
          desconto_unitario: 2,
        }, // total item = (22-2)*2 = 40
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
    expect(body).toHaveProperty("status", "confirmado");
    expect(body).toHaveProperty("total_bruto", "89.00"); // (22*2) + (15*3) = 44 + 45 = 89
    expect(body).toHaveProperty("desconto_total", "4.00");
    expect(body).toHaveProperty("total_liquido", "85.00"); // 40 + 45
  });

  test("PUT após criação permite editar itens e cabeçalho; reprocessa movimentos (200)", async () => {
    const cliente = await criaParceiroPF("Cliente PF 2");
    const p1 = await criaProduto("Brinquedo", 50);

    // cria pedido inicial (confirmado) com 1 item via COMPRA para não exigir saldo
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

    // editar itens deve funcionar (200) e recriar movimentos
    const p2 = await criaProduto("Shampoo", 25);
    const putItens = await fetch(
      `http://localhost:3000/api/v1/pedidos/${pedido.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "COMPRA",
          itens: [{ produto_id: p2.id, quantidade: 2, preco_unitario: 20 }],
          observacao: "editado",
        }),
      },
    );
    expect(putItens.status).toBe(200);

    // lê para verificar itens e cabeçalho atualizados
    const get = await fetch(
      `http://localhost:3000/api/v1/pedidos/${pedido.id}`,
    );
    const body = await get.json();
    expect(body).toHaveProperty("observacao", "editado");
    expect(Array.isArray(body.itens)).toBe(true);
    expect(body.itens.length).toBe(1);
    expect(body.itens[0].produto_id).toBe(p2.id);
    expect(Number(body.itens[0].quantidade)).toBe(2);

    // verifica que movimentos foram reprocessados (documento do pedido nos movimentos do produto2)
    const movs = await fetch(
      `http://localhost:3000/api/v1/estoque/movimentos?produto_id=${p2.id}`,
    );
    const movList = await movs.json();
    expect(
      movList.some((m) => m.documento === `PEDIDO:${pedido.id}`),
    ).toBeTruthy();
  });

  test("Venda gera movimentos no POST e permite editar itens com validação de saldo", async () => {
    const cliente = await criaParceiroPF("Cliente PF 4");
    const prod = await criaProduto("Petisco", 10);

    // entrada para ter saldo
    await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produto_id: prod.id,
        tipo: "ENTRADA",
        quantidade: 5,
        valor_unitario: 8,
      }),
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

    // editar itens com quantidade válida deve funcionar (200)
    const putOk = await fetch(
      `http://localhost:3000/api/v1/pedidos/${pedido.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "VENDA",
          itens: [{ produto_id: prod.id, quantidade: 1, preco_unitario: 12 }],
        }),
      },
    );
    expect(putOk.status).toBe(200);

    // tentativa de vender acima do saldo deve falhar (400)
    const putBad = await fetch(
      `http://localhost:3000/api/v1/pedidos/${pedido.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "VENDA",
          itens: [{ produto_id: prod.id, quantidade: 999 }],
        }),
      },
    );
    expect(putBad.status).toBe(400);

    // verifica que o saldo reduziu para o produto após o POST (movimento de SAIDA aplicado)
    const listaMov = await fetch(
      `http://localhost:3000/api/v1/estoque/movimentos?produto_id=${prod.id}`,
    );
    const movimentos = await listaMov.json();
    expect(Array.isArray(movimentos)).toBe(true);
    expect(
      movimentos.find(
        (m) => m.documento === `PEDIDO:${pedido.id}` && m.tipo === "SAIDA",
      ),
    ).toBeTruthy();
  });
});
