/**
 * @jest-environment node
 */
// tests/api/v1/produtos/top.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

function randomDigits(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}
function yyyyMM(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status))
    throw new Error(`Migrations falharam status ${mig.status}`);
});

async function criaParceiro(tipo = "PF", nome = "Cliente Top API") {
  const body =
    tipo === "PF"
      ? { name: nome, entity_type: "PF", document_digits: randomDigits(11) }
      : { name: nome, entity_type: "PJ" };
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}
async function criaProduto(nome, preco) {
  const forn = await criaParceiro("PJ", "FORN TOP API");
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
  return resp.json();
}
async function entrada(produto_id, quantidade, valor_unitario) {
  const r = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id,
      tipo: "ENTRADA",
      quantidade,
      valor_unitario,
    }),
  });
  expect([200, 201]).toContain(r.status);
}
async function venda(cliente, itens, data_emissao) {
  const body = {
    tipo: "VENDA",
    partner_entity_id: cliente.id,
    partner_name: cliente.name,
    itens,
  };
  if (data_emissao) body.data_emissao = data_emissao;
  const r = await fetch("http://localhost:3000/api/v1/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  expect([200, 201]).toContain(r.status);
  return r.json();
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("GET /api/v1/produtos/top", () => {
  test("Retorna ranking com topN cap e history", async () => {
    const cliente = await criaParceiro("PF", "Cliente API Top");
    // Criar 3 produtos
    const p1 = await criaProduto("Racao Hist A", 80);
    const p2 = await criaProduto("Racao Hist B", 90);
    const p3 = await criaProduto("Racao Hist C", 100);

    // Entradas custos
    await entrada(p1.id, 20, 30);
    await entrada(p2.id, 20, 40);
    await entrada(p3.id, 20, 50);

    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 10);
    // Vendas mês anterior
    await venda(
      cliente,
      [{ produto_id: p1.id, quantidade: 2, preco_unitario: 80 }],
      ymd(prev),
    ); // lucro (80*2 - 30*2)=100
    await venda(
      cliente,
      [{ produto_id: p2.id, quantidade: 1, preco_unitario: 90 }],
      ymd(prev),
    ); // lucro (90 - 40)=50
    // Vendas mês atual
    await venda(cliente, [
      { produto_id: p1.id, quantidade: 1, preco_unitario: 80 },
    ]); // lucro 50
    await venda(cliente, [
      { produto_id: p3.id, quantidade: 2, preco_unitario: 100 },
    ]); // lucro (200 - 100)=100

    const month = yyyyMM(now);
    const resp = await fetch(
      `http://localhost:3000/api/v1/produtos/top?month=${month}&topN=10&productMonths=6`,
    );
    expect(resp.status).toBe(200);
    const json = await resp.json();
    expect(Array.isArray(json.top)).toBe(true);
    expect(Array.isArray(json.history)).toBe(true);
    expect(json.meta.topNUsed).toBeLessThanOrEqual(10);
    // Cada item valida campos e consistência lucro = receita - cogs
    json.top.forEach((r) => {
      expect(r).toHaveProperty("produto_id");
      expect(r).toHaveProperty("lucro");
      expect(Number((Number(r.receita) - Number(r.cogs)).toFixed(2))).toBe(
        Number(Number(r.lucro).toFixed(2)),
      );
    });
    // History contem entradas para produtos listados
    const histMap = new Map(json.history.map((h) => [h.produto_id, h.history]));
    json.top.forEach((r) => expect(histMap.has(r.produto_id)).toBe(true));
  });

  test("Respeita cap topN=50", async () => {
    const month = yyyyMM(new Date());
    const resp = await fetch(
      `http://localhost:3000/api/v1/produtos/top?month=${month}&topN=999`,
    );
    expect(resp.status).toBe(200);
    const json = await resp.json();
    expect(json.meta.topNUsed).toBeLessThanOrEqual(50);
  });
});
