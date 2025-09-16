/**
 * @jest-environment node
 */
// tests/api/v1/entities/edge-cases.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(35000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  // Garante que migrações globais já aplicadas permanecem; apenas limpa dados.
  try {
    await database.query('TRUNCATE TABLE entities RESTART IDENTITY CASCADE;');
  } catch (_) {
    // se tabela não existe (primeira execução), chama endpoint para aplicar
    const mig = await fetch('http://localhost:3000/api/v1/migrations', { method: 'POST' });
    if (![200, 201].includes(mig.status)) throw new Error('Falha migrações edge-cases');
  }
});

describe("Entities edge cases", () => {
  test("Filtro status inválido deve retornar 400", async () => {
    const res = await fetch("http://localhost:3000/api/v1/entities?status=foo");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("Filtro pending inválido deve retornar 400", async () => {
    const res = await fetch(
      "http://localhost:3000/api/v1/entities?pending=maybe",
    );
    expect(res.status).toBe(400);
  });

  test("POST CPF com 11 dígitos inválido deve resultar em status provisional", async () => {
    const payload = {
      name: "CPF INVALIDO",
      entity_type: "PF",
      document_digits: "11111111111", // dígitos repetidos -> inválido
      document_pending: false,
    };
    const res = await fetch("http://localhost:3000/api/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.document_status).toBe("provisional");
  });

  test("POST CNPJ inválido 14 dígitos deve resultar provisional", async () => {
    const payload = {
      name: "CNPJ INVALIDO",
      entity_type: "PJ",
      document_digits: "11111111000111", // estrutura 14 mas inválido
      document_pending: false,
    };
    const res = await fetch("http://localhost:3000/api/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.document_status).toBe("provisional");
  });

  test("POST duplicado (mesmo documento) deve retornar 409", async () => {
    const body = {
      name: "DUPLICADO",
      entity_type: "PF",
      document_digits: "52998224725", // válido
      document_pending: false,
    };
    // primeiro create
    const first = await fetch("http://localhost:3000/api/v1/entities", { method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect(first.status).toBe(201);
    // segundo igual
    const second = await fetch("http://localhost:3000/api/v1/entities", { method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    expect(second.status).toBe(409);
    const secondBody = await second.json();
    expect(secondBody.error).toMatch(/Documento já cadastrado|entidade com este documento/i);
  });
});
