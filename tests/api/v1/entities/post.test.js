/**
 * @jest-environment node
 */
// tests/api/v1/entities/post.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

// Usaremos TDD: este teste vai falhar até criarmos migração + endpoint.
jest.setTimeout(35000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  // Isola ambiente limpando schema para previsibilidade
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  // Aplica migrações (cria tabela entities)
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(
      `Falha ao aplicar migrações para teste entities. Status: ${mig.status}`,
    );
  }
});

describe("POST /api/v1/entities (TDD inicial)", () => {
  test("Deve criar entidade PF pendente retornando 201 e estrutura mínima", async () => {
    const payload = {
      name: "JOAO DA SILVA", // já em caixa alta
      entity_type: "PF",
      document_digits: "", // usuário marcou como pendente
      document_pending: true,
      cep: "01001000",
      telefone: "11988887777",
      email: "joao@example.com",
    };

    const response = await fetch("http://localhost:3000/api/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect([200, 201]).toContain(response.status); // aceitaremos 200 ou 201 enquanto definimos padrão

    const body = await response.json();

    // Estrutura básica
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("name", payload.name);
    expect(body).toHaveProperty("entity_type", "PF");
    expect(body).toHaveProperty("document_status");
    expect(body).toHaveProperty("document_pending", true);
    expect(body).toHaveProperty("created_at");
    expect(body).toHaveProperty("updated_at");

    // Regras de status esperadas para documento vazio + pendente
    expect(body.document_status).toBe("pending");

    // Garantir que não armazenamos máscara (só dígitos ou vazio)
    expect(body).toHaveProperty("document_digits", "");
  });

  test("Deve criar entidade PF com CPF válido retornando status valid", async () => {
    // CPF válido de teste (gera dígitos consistentes) 39053344705
    const payload = {
      name: "MARIA TESTE",
      entity_type: "PF",
      document_digits: "39053344705",
      document_pending: false,
    };

    const response = await fetch("http://localhost:3000/api/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect([200, 201]).toContain(response.status);
    const body = await response.json();

    expect(body.document_digits).toBe(payload.document_digits);
    expect(body.document_status).toBe("valid");
    expect(body.document_pending).toBe(false);
  });

  test("Deve classificar como provisional quando CPF parcial enviado", async () => {
    const payload = {
      name: "CPF PARCIAL",
      entity_type: "PF",
      document_digits: "39053", // parcial
      document_pending: false,
    };

    const response = await fetch("http://localhost:3000/api/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect([200, 201]).toContain(response.status);
    const body = await response.json();

    expect(body.document_status).toBe("provisional");
  });

  test("Deve validar entity_type inválido retornando 400", async () => {
    const payload = {
      name: "TIPO INVALIDO",
      entity_type: "XX",
      document_digits: "",
      document_pending: true,
    };

    const response = await fetch("http://localhost:3000/api/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("Deve validar name vazio retornando 400", async () => {
    const payload = {
      name: " ",
      entity_type: "PF",
      document_digits: "",
      document_pending: true,
    };

    const response = await fetch("http://localhost:3000/api/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});
