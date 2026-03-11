/**
 * @jest-environment node
 *
 * Testes de /api/v1/users (apenas admin):
 * - GET sem cookie → 401
 * - GET com operador → 403
 * - GET com admin → 200
 * - POST com operador → 403
 * - POST com admin → 201
 * - PUT com operador → 403
 * - DELETE com operador → 403
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
let createdUserId;

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
    values: ["Operador Users Test", "operador-users@hero-pet.test", hash],
  });
  operadorCookie = await getAuthCookie(
    "operador-users@hero-pet.test",
    "oper123"
  );
});

test("GET /api/v1/users sem cookie retorna 401", async () => {
  const res = await fetch(`${BASE_URL}/api/v1/users`);
  expect(res.status).toBe(401);
  const data = await res.json();
  expect(data.error).toContain("autenticado");
});

test("GET /api/v1/users com operador retorna 403", async () => {
  const res = await fetch(`${BASE_URL}/api/v1/users`, {
    headers: { Cookie: operadorCookie },
  });
  expect(res.status).toBe(403);
});

test("GET /api/v1/users com admin retorna 200", async () => {
  const res = await fetch(`${BASE_URL}/api/v1/users`, {
    headers: { Cookie: adminCookie },
  });
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(Array.isArray(data)).toBe(true);
});

test("POST /api/v1/users com operador retorna 403", async () => {
  const res = await fetch(`${BASE_URL}/api/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: operadorCookie,
    },
    body: JSON.stringify({
      nome: "Novo User",
      email: "novo@test.local",
      senha: "senha123",
      role: "operador",
    }),
  });
  expect(res.status).toBe(403);
});

test("POST /api/v1/users com admin cria usuário", async () => {
  const res = await fetch(`${BASE_URL}/api/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      nome: "User Criado Test",
      email: "criado-users@hero-pet.test",
      senha: "senha12345",
      role: "visualizador",
    }),
  });
  expect(res.status).toBe(201);
  const data = await res.json();
  expect(data.id).toBeDefined();
  expect(data.nome).toBe("User Criado Test");
  expect(data.email).toBe("criado-users@hero-pet.test");
  expect(data.role).toBe("visualizador");
  createdUserId = data.id;
});

test("PUT /api/v1/users/:id com operador retorna 403", async () => {
  if (!createdUserId) return;
  const res = await fetch(`${BASE_URL}/api/v1/users/${createdUserId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: operadorCookie,
    },
    body: JSON.stringify({ nome: "Atualizado" }),
  });
  expect(res.status).toBe(403);
});

test("DELETE /api/v1/users/:id com operador retorna 403", async () => {
  if (!createdUserId) return;
  const res = await fetch(`${BASE_URL}/api/v1/users/${createdUserId}`, {
    method: "DELETE",
    headers: { Cookie: operadorCookie },
  });
  expect(res.status).toBe(403);
});
