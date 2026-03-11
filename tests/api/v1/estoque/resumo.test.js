/**
 * @jest-environment node
 *
 * Smoke test para GET /api/v1/estoque/resumo (listagem de saldos para tela de estoque).
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

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations();
  cookie = await getAuthenticatedCookie();

  const f = await fetch(`${BASE_URL}/api/v1/entities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ name: "Forn Resumo", entity_type: "PJ" }),
  });
  if (![200, 201].includes(f.status)) throw new Error("seed fornecedor fail");
  const fornecedor = await f.json();

  const p = await fetch(`${BASE_URL}/api/v1/produtos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      nome: "Prod Resumo Test",
      fornecedor_id: fornecedor.id,
      estoque_minimo: 5,
    }),
  });
  if (![200, 201].includes(p.status)) throw new Error("seed produto fail");
});

test("GET /api/v1/estoque/resumo retorna array de saldos", async () => {
  const resp = await fetch(`${BASE_URL}/api/v1/estoque/resumo`, {
    headers: { Cookie: cookie },
  });
  expect(resp.status).toBe(200);
  const data = await resp.json();
  expect(Array.isArray(data)).toBe(true);
  if (data.length > 0) {
    const row = data[0];
    expect(row).toHaveProperty("produto_id");
    expect(row).toHaveProperty("nome");
    expect(row).toHaveProperty("saldo");
    expect(row).toHaveProperty("estoque_minimo");
  }
});
