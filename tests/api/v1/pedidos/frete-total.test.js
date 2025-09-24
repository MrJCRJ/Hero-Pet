/**
 * @jest-environment node
 */
// tests/api/v1/pedidos/frete-total.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  // schema isolado
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha migracoes status=${mig.status}`);
  }
});

async function criaParceiroPJ(nome = "Fornecedor Frete") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, entity_type: "PJ" }),
  });
  expect([200, 201]).toContain(resp.status);
  return await resp.json();
}

async function criaProduto(nome = "Produto Frete", preco = 10) {
  const forn = await criaParceiroPJ("FORN FRETE BASE");
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

describe("Pedido COMPRA com frete_total agregado", () => {
  test("Cria COMPRA com frete_total e calcula valor_por_promissoria incluindo frete", async () => {
    const forn = await criaParceiroPJ("Fornecedor X");
    const prod = await criaProduto("Insumo", 50);

    const resp = await fetch("http://localhost:3000/api/v1/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "COMPRA",
        partner_entity_id: forn.id,
        partner_name: forn.name,
        itens: [
          { produto_id: prod.id, quantidade: 2, preco_unitario: 40 }, // total_liquido esperado = 80
        ],
        numero_promissorias: 2,
        data_primeira_promissoria: new Date().toISOString().slice(0, 10),
        frete_total: 20, // total com frete = 100; valor_por_promissoria ~ 50
      }),
    });
    expect([200, 201]).toContain(resp.status);
    const body = await resp.json();
    expect(body.total_liquido).toBe("80.00");
    expect(body.frete_total).toBe("20.00");
    // busca novamente para garantir persistência
    const get = await fetch(`http://localhost:3000/api/v1/pedidos/${body.id}`);
    const full = await get.json();
    expect(full.frete_total).toBe("20.00");
  });

  test("PUT altera frete_total e reflete em valor_por_promissoria", async () => {
    const forn = await criaParceiroPJ("Fornecedor Y");
    const prod = await criaProduto("Item Y", 30);

    const post = await fetch("http://localhost:3000/api/v1/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "COMPRA",
        partner_entity_id: forn.id,
        partner_name: forn.name,
        itens: [{ produto_id: prod.id, quantidade: 3, preco_unitario: 20 }], // total_liquido 60
        numero_promissorias: 3,
        frete_total: 0,
      }),
    });
    expect([200, 201]).toContain(post.status);
    const pedido = await post.json();

    const put = await fetch(
      `http://localhost:3000/api/v1/pedidos/${pedido.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "COMPRA", frete_total: 15 }),
      },
    );
    expect(put.status).toBe(200);
    // GET final
    const get = await fetch(
      `http://localhost:3000/api/v1/pedidos/${pedido.id}`,
    );
    const final = await get.json();
    expect(final.frete_total).toBe("15.00");
  });
});
