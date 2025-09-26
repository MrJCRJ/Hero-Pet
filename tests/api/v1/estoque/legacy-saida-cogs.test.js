// @jest-environment node
// Testa que SAIDA legacy (sem FIFO habilitado) agora registra custo_unitario_rec e custo_total_rec
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(30000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  // Isolar schema
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) throw new Error("Falha migrations");
});

test("SAIDA legacy preenche custo reconhecido (média)", async () => {
  // Cria fornecedor e produto
  const forn = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "FORN LEG", entity_type: "PJ" }),
  });
  expect([200, 201]).toContain(forn.status);
  const fornJson = await forn.json();
  const prodResp = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Prod Legacy",
      preco_tabela: 50,
      fornecedor_id: fornJson.id,
    }),
  });
  expect([200, 201]).toContain(prodResp.status);
  const prod = await prodResp.json();

  // Duas entradas (sem FIFO flag) => média  (10*5 + 12*5)/10 = 11
  const ent1 = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: prod.id,
      tipo: "ENTRADA",
      quantidade: 5,
      valor_unitario: 10,
    }),
  });
  expect([200, 201]).toContain(ent1.status);
  const ent2 = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: prod.id,
      tipo: "ENTRADA",
      quantidade: 5,
      valor_unitario: 12,
    }),
  });
  expect([200, 201]).toContain(ent2.status);

  // SAIDA legacy (FIFO_DISABLED) quantidade 4 => custo_total_rec deve ser 4 * 11 = 44
  const saida = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: prod.id,
      tipo: "SAIDA",
      quantidade: 4,
      documento: "TEST:LEG",
    }),
  });
  const saidaJson = await saida.json();
  expect([200, 201]).toContain(saida.status);
  expect(Number(saidaJson.custo_unitario_rec)).toBeCloseTo(11, 2);
  expect(Number(saidaJson.custo_total_rec)).toBeCloseTo(44, 2);
});
