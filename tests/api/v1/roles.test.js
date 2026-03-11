/**
 * @jest-environment node
 *
 * Testes de withRole:
 * - GET sem cookie → 401
 * - GET com cookie autenticado → 200 (ou 404)
 * - DELETE com operador → 403 (apenas admin)
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";
import bcrypt from "bcryptjs";
import { runMigrations } from "tests/utils/runMigrations.js";
import {
  getAuthCookie,
  ensureTestUser,
  BASE_URL,
  TEST_EMAIL,
  TEST_PASSWORD,
} from "tests/utils/authHelpers.js";

jest.setTimeout(60000);

let adminCookie;
let operadorCookie;
let entityId;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations();
  await ensureTestUser();
  adminCookie = await getAuthCookie(TEST_EMAIL, TEST_PASSWORD);

  const hash = await bcrypt.hash("oper123", 10);
  await database.query({
    text: `INSERT INTO users (nome, email, senha_hash, role)
           VALUES ($1, $2, $3, 'operador')`,
    values: ["Operador Test", "operador@hero-pet.test", hash],
  });
  operadorCookie = await getAuthCookie("operador@hero-pet.test", "oper123");

  const entRes = await fetch(`${BASE_URL}/api/v1/entities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ name: "Ent Roles Test", entity_type: "PJ" }),
  });
  if (![200, 201].includes(entRes.status))
    throw new Error("seed entity fail");
  const ent = await entRes.json();
  entityId = ent.id;
});

test("GET sem cookie retorna 401", async () => {
  const res = await fetch(`${BASE_URL}/api/v1/entities`, { method: "GET" });
  expect(res.status).toBe(401);
  const data = await res.json();
  expect(data.error).toContain("autenticado");
});

test("GET com cookie autenticado retorna 200 ou 404", async () => {
  const res = await fetch(`${BASE_URL}/api/v1/entities`, {
    method: "GET",
    headers: { Cookie: adminCookie },
  });
  expect([200, 404]).toContain(res.status);
  if (res.status === 200) {
    const data = await res.json();
    expect(Array.isArray(data) || typeof data === "object").toBe(true);
  }
});

test("DELETE com operador retorna 403", async () => {
  const res = await fetch(`${BASE_URL}/api/v1/entities/${entityId}`, {
    method: "DELETE",
    headers: { Cookie: operadorCookie },
  });
  expect(res.status).toBe(403);
  const data = await res.json();
  expect(data.error).toBeDefined();
});

test("DELETE com admin retorna 200 ou 204", async () => {
  const res = await fetch(`${BASE_URL}/api/v1/entities/${entityId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  expect([200, 204]).toContain(res.status);
});
