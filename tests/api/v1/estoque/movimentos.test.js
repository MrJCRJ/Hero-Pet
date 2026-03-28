/**
 * @jest-environment node
 *
 * Testes de validação de estoque em POST /api/v1/estoque/movimentos:
 * - Estoque insuficiente para SAIDA
 * - ENTRADA + SAIDA dentro do saldo → 201
 * - Casos de borda: saldo exato, ajuste zerando, ajuste negativo excedendo
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";
import { runMigrations } from "tests/utils/runMigrations.js";
import {
  getAuthenticatedCookie,
  BASE_URL,
} from "tests/utils/authHelpers.js";

jest.setTimeout(60000);

let cookie;
let produtoId;

async function api(method, path, body, useAuth = true) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (useAuth && cookie) opts.headers.Cookie = cookie;
  if (body && (method === "POST" || method === "PUT")) {
    opts.body = JSON.stringify(body);
  }
  return fetch(`${BASE_URL}${path}`, opts);
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations();
  cookie = await getAuthenticatedCookie();

  const entRes = await api("POST", "/api/v1/entities", {
    name: "Forn Mov Test",
    entity_type: "PJ",
  });
  if (![200, 201].includes(entRes.status))
    throw new Error("seed entity fail: " + (await entRes.text()));
  const fornecedor = await entRes.json();

  const prodRes = await api("POST", "/api/v1/produtos", {
    nome: "Prod Mov Test",
    fornecedor_id: fornecedor.id,
  });
  if (![200, 201].includes(prodRes.status))
    throw new Error("seed produto fail: " + (await prodRes.text()));
  const produto = await prodRes.json();
  produtoId = produto.id;
});

test("POST SAIDA com saldo 0 retorna 400 Estoque insuficiente", async () => {
  const res = await api("POST", "/api/v1/estoque/movimentos", {
    produto_id: produtoId,
    tipo: "SAIDA",
    quantidade: 1,
  });
  expect(res.status).toBe(400);
  const data = await res.json();
  expect(data.error).toBe("Estoque insuficiente");
});

test("POST ENTRADA depois SAIDA dentro do saldo retorna 201", async () => {
  const ent = await api("POST", "/api/v1/estoque/movimentos", {
    produto_id: produtoId,
    tipo: "ENTRADA",
    quantidade: 10,
    valor_unitario: 5,
  });
  expect(ent.status).toBe(201);

  const sai = await api("POST", "/api/v1/estoque/movimentos", {
    produto_id: produtoId,
    tipo: "SAIDA",
    quantidade: 3,
  });
  expect(sai.status).toBe(201);
});

test("POST SAIDA com saldo exato (restante 7) retorna 201", async () => {
  const res = await api("POST", "/api/v1/estoque/movimentos", {
    produto_id: produtoId,
    tipo: "SAIDA",
    quantidade: 7,
  });
  expect(res.status).toBe(201);
});

test("POST AJUSTE zerando saldo retorna 201", async () => {
  const ent = await api("POST", "/api/v1/estoque/movimentos", {
    produto_id: produtoId,
    tipo: "ENTRADA",
    quantidade: 5,
    valor_unitario: 1,
  });
  expect(ent.status).toBe(201);

  const aj = await api("POST", "/api/v1/estoque/movimentos", {
    produto_id: produtoId,
    tipo: "AJUSTE",
    quantidade: -5,
  });
  expect(aj.status).toBe(201);
});

test("POST AJUSTE negativo que excede saldo retorna 400", async () => {
  const ent = await api("POST", "/api/v1/estoque/movimentos", {
    produto_id: produtoId,
    tipo: "ENTRADA",
    quantidade: 2,
    valor_unitario: 1,
  });
  expect(ent.status).toBe(201);

  const aj = await api("POST", "/api/v1/estoque/movimentos", {
    produto_id: produtoId,
    tipo: "AJUSTE",
    quantidade: -5,
  });
  expect(aj.status).toBe(400);
  const data = await aj.json();
  expect(data.error).toContain("excederia");
});
