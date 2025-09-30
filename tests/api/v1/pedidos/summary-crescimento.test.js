/**
 * @jest-environment node
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

function randomDigits(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yyyyMM(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

async function criaPF(nome = "Cliente MoM") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nome,
      entity_type: "PF",
      document_digits: randomDigits(11),
      ativo: true,
    }),
  });
  expect([200, 201]).toContain(resp.status);
  return await resp.json();
}

async function criaPJ(nome = "Fornecedor MoM") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, entity_type: "PJ" }),
  });
  expect([200, 201]).toContain(resp.status);
  return await resp.json();
}

async function criaProduto(nome = "Prod MoM", preco = 100) {
  const forn = await criaPJ("FORN MoM");
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

describe("Summary Crescimento MoM", () => {
  test("Calcula crescimento vs mês anterior", async () => {
    const cliente = await criaPF();
    const prod = await criaProduto();

    const now = new Date();
    const curMonth = yyyyMM(now);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 10);
    const prevMonth = yyyyMM(prev);

    // Garantir estoque para as vendas
    const entrada = await fetch(
      "http://localhost:3000/api/v1/estoque/movimentos",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: prod.id,
          tipo: "ENTRADA",
          quantidade: 10,
          valor_unitario: 50,
        }),
      },
    );
    expect([200, 201]).toContain(entrada.status);

    // Uma venda no mês anterior: 200
    const vendaPrev = await fetch("http://localhost:3000/api/v1/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        partner_name: cliente.name,
        data_emissao: ymd(prev),
        itens: [{ produto_id: prod.id, quantidade: 1, preco_unitario: 200 }],
      }),
    });
    expect([200, 201]).toContain(vendaPrev.status);

    // Duas vendas no mês atual: 300
    const vendaCur = await fetch("http://localhost:3000/api/v1/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        partner_name: cliente.name,
        itens: [{ produto_id: prod.id, quantidade: 1, preco_unitario: 300 }],
      }),
    });
    expect([200, 201]).toContain(vendaCur.status);

    const sumPrev = await fetch(
      `http://localhost:3000/api/v1/pedidos/summary?month=${prevMonth}&nocache=1`,
    );
    expect(sumPrev.status).toBe(200);
    const jsPrev = await sumPrev.json();
    expect(Number(jsPrev.vendasMes)).toBe(200);

    const sumCur = await fetch(
      `http://localhost:3000/api/v1/pedidos/summary?month=${curMonth}&nocache=1`,
    );
    expect(sumCur.status).toBe(200);
    const jsCur = await sumCur.json();
    expect(Number(jsCur.vendasMesAnterior)).toBe(200);
    expect(Number(jsCur.vendasMes)).toBe(300);
    // Crescimento: (300-200)/200 = 50%
    expect(Number(jsCur.crescimentoMoMPerc)).toBe(50);
  });
});
