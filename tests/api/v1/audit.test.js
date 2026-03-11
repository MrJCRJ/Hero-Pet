/**
 * @jest-environment node
 *
 * Teste de withAudit: após DELETE de entity, verificar registro na tabela log.
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";
import { runMigrations } from "tests/utils/runMigrations.js";
import {
  getAuthenticatedCookie,
  BASE_URL,
  TEST_EMAIL,
} from "tests/utils/authHelpers.js";

jest.setTimeout(60000);

let cookie;
let adminId;
let entityId;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations();
  cookie = await getAuthenticatedCookie();

  const userRes = await database.query({
    text: "SELECT id FROM users WHERE email = $1",
    values: [TEST_EMAIL],
  });
  adminId = userRes.rows[0]?.id;

  const entRes = await fetch(`${BASE_URL}/api/v1/entities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ name: "Ent Audit Test", entity_type: "PF" }),
  });
  if (![200, 201].includes(entRes.status)) throw new Error("seed entity fail");
  const ent = await entRes.json();
  entityId = ent.id;
});

test("DELETE de entity registra ENTITY_DELETE na tabela log", async () => {
  const delRes = await fetch(`${BASE_URL}/api/v1/entities/${entityId}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  expect([200, 204]).toContain(delRes.status);

  const logRes = await database.query({
    text: `SELECT user_id, action, entity_type, entity_id 
           FROM log 
           WHERE action = 'ENTITY_DELETE' 
           ORDER BY created_at DESC 
           LIMIT 1`,
    values: [],
  });
  expect(logRes.rows.length).toBeGreaterThan(0);
  const row = logRes.rows[0];
  expect(row.action).toBe("ENTITY_DELETE");
  expect(row.entity_type).toBe("entity");
  expect(String(row.entity_id)).toBe(String(entityId));
  expect(Number(row.user_id)).toBe(Number(adminId));
});
