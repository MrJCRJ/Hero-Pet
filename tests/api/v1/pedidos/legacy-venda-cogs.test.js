// @jest-environment node
// Garante que pedido VENDA legacy (sem lotes) grava custo_unit_venda nos itens e custo reconhecido em movimento_estoque após fix.
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(30000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) throw new Error("Falha migrations");
});

async function criaEntityPF(name = "CLI LEGACY") {
  const r = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, entity_type: "PF" }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("entity pf" + JSON.stringify(j));
  return j;
}
async function criaFornecedorPJ(name = "FORN LEGACY") {
  const r = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, entity_type: "PJ" }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("forn" + JSON.stringify(j));
  return j;
}
async function criaProduto(nome = "Prod VEND LEG", preco = 30) {
  const forn = await criaFornecedorPJ();
  const r = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, preco_tabela: preco, fornecedor_id: forn.id }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("prod" + JSON.stringify(j));
  return j;
}

test("Pedido VENDA legacy registra custos reconhecidos em movimentos", async () => {
  const cliente = await criaEntityPF();
  const prod = await criaProduto();
  // Entradas agregadas (sem FIFO flag -> sem lotes)
  const e1 = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: prod.id,
      tipo: "ENTRADA",
      quantidade: 10,
      valor_unitario: 8,
    }),
  });
  expect([200, 201]).toContain(e1.status);
  const e2 = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: prod.id,
      tipo: "ENTRADA",
      quantidade: 5,
      valor_unitario: 10,
    }),
  });
  expect([200, 201]).toContain(e2.status);
  // média = (10*8 + 5*10)/15 = (80+50)/15 = 130/15 = 8.6667
  const venda = await fetch("http://localhost:3000/api/v1/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      itens: [{ produto_id: prod.id, quantidade: 6, preco_unitario: 20 }],
    }),
  });
  const vendaJson = await venda.json();
  expect([200, 201]).toContain(venda.status);
  // pedido itens
  const getPedido = await fetch(
    `http://localhost:3000/api/v1/pedidos/${vendaJson.id}`,
  );
  const pedBody = await getPedido.json();
  const item = pedBody.itens[0];
  expect(Number(item.custo_unit_venda)).toBeCloseTo(8.6667, 2);
  expect(Number(item.custo_total_item)).toBeCloseTo(52.0, 1); // 8.6667 * 6 ~ 52.0002
  // movimento saida correspondente
  // Buscar movimento diretamente via query auxiliar (test only) já que endpoint de listagem não expõe custo_* (decisão de escopo); garantimos persistência via leitura direta.
  const direct = await database.query({
    text: `SELECT custo_unitario_rec, custo_total_rec FROM movimento_estoque WHERE produto_id=$1 AND tipo='SAIDA' ORDER BY id DESC LIMIT 1`,
    values: [prod.id],
  });
  expect(direct.rows.length).toBe(1);
  expect(Number(direct.rows[0].custo_unitario_rec)).toBeCloseTo(8.6667, 2);
  expect(Number(direct.rows[0].custo_total_rec)).toBeCloseTo(52.0, 1);
});
