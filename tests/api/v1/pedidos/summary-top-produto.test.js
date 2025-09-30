/**
 * @jest-environment node
 */
// tests/api/v1/pedidos/summary-top-produto.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

function randomDigits(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function yyyyMM(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", { method: "POST" });
  if (![200, 201].includes(mig.status)) throw new Error(`Migrations falharam status ${mig.status}`);
});

async function criaParceiroPF(nome = "Cliente Top") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, entity_type: "PF", document_digits: randomDigits(11), ativo: true })
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}
async function criaParceiroPJ(nome = "Fornecedor Top") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, entity_type: "PJ" })
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}
async function criaProduto(nome, preco) {
  const forn = await criaParceiroPJ("FORN TOP");
  const resp = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, preco_tabela: preco, ativo: true, fornecedor_id: forn.id })
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}

async function entradaEstoque(produto_id, quantidade, valor_unitario) {
  const entrada = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ produto_id, tipo: "ENTRADA", quantidade, valor_unitario })
  });
  expect([200, 201]).toContain(entrada.status);
}

async function venda(cliente, itens) {
  const venda = await fetch("http://localhost:3000/api/v1/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: "VENDA", partner_entity_id: cliente.id, partner_name: cliente.name, itens })
  });
  expect([200, 201]).toContain(venda.status);
  return venda.json();
}

describe("Summary Top Produto Lucro", () => {
  test("Retorna topProdutoLucro coerente com dados", async () => {
    const cliente = await criaParceiroPF();
    // Dois produtos
    const p1 = await criaProduto("Racao Premium A", 100);
    const p2 = await criaProduto("Racao Premium B", 150);

    // Entradas (custo): p1 custo 40 cada, p2 custo 60 cada
    await entradaEstoque(p1.id, 10, 40);
    await entradaEstoque(p2.id, 10, 60);

    // Vendas: p1 vende 3 a 100 => receita 300; COGS 3*40=120; lucro 180
    await venda(cliente, [{ produto_id: p1.id, quantidade: 3, preco_unitario: 100 }]);
    // p2 vende 2 a 150 => receita 300; COGS 2*60=120; lucro 180 (empate de lucro, desempate por receita igual -> ordem estável pelo ORDER BY), ambos podem aparecer; primeiro qualquer.
    await venda(cliente, [{ produto_id: p2.id, quantidade: 2, preco_unitario: 150 }]);

    const month = yyyyMM(new Date());
    const sum = await fetch(`http://localhost:3000/api/v1/pedidos/summary?month=${month}`);
    expect(sum.status).toBe(200);
    const json = await sum.json();
    expect(json).toHaveProperty("topProdutoLucro");
    expect(json).toHaveProperty("topProdutosLucro");
    expect(json).toHaveProperty("topProdutosHistory");
    expect(Array.isArray(json.topProdutosLucro)).toBe(true);
    expect(Array.isArray(json.topProdutosHistory)).toBe(true);
    // Cada item deve ter campos previstos
    json.topProdutosLucro.forEach(r => {
      expect(r).toHaveProperty("produto_id");
      expect(r).toHaveProperty("nome");
      expect(r).toHaveProperty("receita");
      expect(r).toHaveProperty("cogs");
      expect(r).toHaveProperty("lucro");
      expect(r).toHaveProperty("margem");
      expect(r).toHaveProperty("quantidade");
      expect(r).toHaveProperty("lucro_unitario");
    });
    // Verifica consistência lucro = receita - cogs no primeiro
    expect(json.topProdutoLucro).not.toBeNull();
    expect(Number(json.topProdutoLucro.lucro).toFixed(2)).toBe((Number(json.topProdutoLucro.receita) - Number(json.topProdutoLucro.cogs)).toFixed(2));
    // History consistência (cada produto listado tem objeto de history)
    const histMap = new Map(json.topProdutosHistory.map(h => [h.produto_id, h.history]));
    json.topProdutosLucro.forEach(r => {
      expect(histMap.has(r.produto_id)).toBe(true);
    });
  });
});
