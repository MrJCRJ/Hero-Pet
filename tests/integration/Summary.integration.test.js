/**
 * @jest-environment node
 */
import migrationRunner from "node-pg-migrate";
import { join } from "path";
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";
import { getAuthenticatedCookie } from "tests/utils/authHelpers.js";

jest.setTimeout(90000);

let authCookie = "";

async function runMigrationsUp() {
  const client = await database.getNewClient();
  try {
    await migrationRunner({
      direction: "up",
      dir: join("infra", "migrations"),
      migrationsTable: "pgmigrations",
      dbClient: client,
      verbose: false,
    });
  } finally {
    if (client && typeof client.end === "function") {
      await client.end();
    }
  }
}

function authHeaders() {
  return { Cookie: authCookie };
}

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
}, 90000);
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrationsUp();
  authCookie = await getAuthenticatedCookie();
});

async function criaPF(nome = "Cliente Test") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      name: nome,
      entity_type: "PF",
      document_digits: randomDigits(11),
      ativo: true,
    }),
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}

async function criaPJ(nome = "Fornecedor Test") {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name: nome, entity_type: "PJ" }),
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}

async function criaProduto(nome = "Prod Test", preco = 100) {
  const forn = await criaPJ("FORN Test");
  const resp = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
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

async function entradaEstoque(produto_id, quantidade, valor_unitario) {
  const resp = await fetch(
    "http://localhost:3000/api/v1/estoque/movimentos",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        produto_id,
        tipo: "ENTRADA",
        quantidade,
        valor_unitario,
      }),
    },
  );
  expect([200, 201]).toContain(resp.status);
}

async function criaVenda(cliente, prod, dataEmissao, total = 100) {
  const resp = await fetch("http://localhost:3000/api/v1/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      partner_name: cliente.name,
      data_emissao: dataEmissao,
      itens: [{ produto_id: prod.id, quantidade: 1, preco_unitario: total }],
    }),
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}

async function criaDespesa(descricao, valor, data_vencimento, categoria = "outros") {
  const resp = await fetch("http://localhost:3000/api/v1/despesas", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      descricao,
      categoria,
      valor,
      data_vencimento,
    }),
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}

describe("Summary integration status and expenses", () => {
  test("Pedidos cancelados não entram no Summary", async () => {
    const cliente = await criaPF();
    const prod = await criaProduto("Prod Status", 50);
    await entradaEstoque(prod.id, 5, 20);

    const now = new Date();
    const curMonth = yyyyMM(now);
    const dataEmissao = ymd(now);

    const venda = await criaVenda(cliente, prod, dataEmissao, 50);
    expect(venda.id).toBeDefined();

    const sumAntes = await fetch(
      `http://localhost:3000/api/v1/pedidos/summary?month=${curMonth}&nocache=1`,
      { headers: authHeaders() },
    );
    expect(sumAntes.status).toBe(200);
    const jsonAntes = await sumAntes.json();
    expect(Number(jsonAntes.vendasMes)).toBe(50);

    await database.query({
      text: "UPDATE pedidos SET status = 'cancelado' WHERE id = $1",
      values: [venda.id],
    });

    const sumDepois = await fetch(
      `http://localhost:3000/api/v1/pedidos/summary?month=${curMonth}&nocache=1`,
      { headers: authHeaders() },
    );
    expect(sumDepois.status).toBe(200);
    const jsonDepois = await sumDepois.json();
    expect(Number(jsonDepois.vendasMes)).toBe(0);
  });

  test("Despesas com data_vencimento no período entram no Summary", async () => {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;
    await criaDespesa("Despesa no período", 150, firstDay);

    const curMonth = yyyyMM(now);
    const sum = await fetch(
      `http://localhost:3000/api/v1/pedidos/summary?month=${curMonth}&nocache=1`,
      { headers: authHeaders() },
    );
    expect(sum.status).toBe(200);
    const json = await sum.json();
    expect(json).toHaveProperty("despesasMes");
    expect(json).toHaveProperty("lucroOperacionalMes");
    expect(json).toHaveProperty("margemOperacionalPerc");
    expect(Number(json.despesasMes)).toBe(150);
  });

  test("Despesas com data_vencimento fora do período não entram", async () => {
    const now = new Date();
    const curMonth = yyyyMM(now);
    const sumAntes = await fetch(
      `http://localhost:3000/api/v1/pedidos/summary?month=${curMonth}&nocache=1`,
      { headers: authHeaders() },
    );
    expect(sumAntes.status).toBe(200);
    const jsonAntes = await sumAntes.json();
    const despesasAntes = Number(jsonAntes.despesasMes);

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const dataFora = ymd(prevMonth);
    await criaDespesa("Despesa fora do período", 999, dataFora);

    const sumDepois = await fetch(
      `http://localhost:3000/api/v1/pedidos/summary?month=${curMonth}&nocache=1`,
      { headers: authHeaders() },
    );
    expect(sumDepois.status).toBe(200);
    const jsonDepois = await sumDepois.json();
    const despesasDepois = Number(jsonDepois.despesasMes);
    expect(despesasDepois).toBe(despesasAntes);
  });

  test("Summary vendas compatível com DRE", async () => {
    const cliente = await criaPF();
    const prod = await criaProduto("Prod DRE", 80);
    await entradaEstoque(prod.id, 10, 30);

    const now = new Date();
    const mes = now.getMonth() + 1;
    const ano = now.getFullYear();
    const dataEmissao = ymd(now);

    await criaVenda(cliente, prod, dataEmissao, 80);

    const curMonth = yyyyMM(now);
    const sum = await fetch(
      `http://localhost:3000/api/v1/pedidos/summary?month=${curMonth}&nocache=1`,
      { headers: authHeaders() },
    );
    expect(sum.status).toBe(200);
    const jsonSum = await sum.json();

    const dre = await fetch(
      `http://localhost:3000/api/v1/relatorios/dre?mes=${mes}&ano=${ano}`,
      { headers: authHeaders() },
    );
    expect(dre.status).toBe(200);
    const jsonDre = await dre.json();

    const dreData = jsonDre.dre;
    expect(Number(jsonSum.vendasMes)).toBe(dreData.receitas);
    expect(Number(jsonSum.lucroBrutoMes)).toBe(dreData.lucroBruto);
    expect(Number(jsonSum.despesasMes)).toBe(dreData.despesas);
    expect(Number(jsonSum.lucroOperacionalMes)).toBe(dreData.lucroOperacional);
  });
});
