/**
 * @jest-environment node
 */
// tests/api/v1/produtos/post.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";
import axios from "axios";
import { runMigrations } from "tests/utils/runMigrations.js";

jest.setTimeout(45000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  // Reset total do schema para previsibilidade
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  // Aplica todas as migrações conhecidas diretamente
  await runMigrations();
});

describe("POST /api/v1/produtos (TDD)", () => {
  test("Rejeita produto sem nenhum fornecedor (400)", async () => {
    const payload = {
      nome: "Ração Premium 10kg",
      categoria: "RACOES",
      ativo: true,
    };

    try {
      await axios.post("http://localhost:3100/api/v1/produtos", payload);
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });

  test("Cria produto com fornecedor PJ válido (201)", async () => {
    // Prepara fornecedor PJ via endpoint existente de entities
    const fornResp = await axios.post("http://localhost:3100/api/v1/entities", {
      name: "FORNECEDOR TESTE LTDA",
      entity_type: "PJ",
      document_digits: "12345678000195", // cnpj qualquer (validade algorítmica não exigida aqui)
      document_pending: false,
    });
    const fornecedor = fornResp.data;

    const payload = {
      nome: "Areia Sanitária 4kg",
      categoria: "HIGIENE",
      suppliers: [fornecedor.id],
      preco_tabela: 29.9,
    };

    const resp = await axios.post("http://localhost:3100/api/v1/produtos", payload);

    expect([200, 201]).toContain(resp.status);
    const body = resp.data;
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("preco_tabela", "29.90");
  });

  test("Cria produto com múltiplos fornecedores (201)", async () => {
    const f1Resp = await axios.post("http://localhost:3100/api/v1/entities", {
      name: "FORN 1 LTDA",
      entity_type: "PJ",
      document_digits: "11111111000191",
      document_pending: false,
    });
    const f1 = f1Resp.data;

    const f2Resp = await axios.post("http://localhost:3100/api/v1/entities", {
      name: "FORN 2 LTDA",
      entity_type: "PJ",
      document_digits: "22222222000109",
      document_pending: false,
    });
    const f2 = f2Resp.data;

    const payload = { nome: "Tapete Higiênico", suppliers: [f1.id, f2.id] };
    const resp = await axios.post("http://localhost:3100/api/v1/produtos", payload);
    expect([200, 201]).toContain(resp.status);

    const body = resp.data;
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("suppliers");
    expect(body.suppliers).toContain(f1.id);
    expect(body.suppliers).toContain(f2.id);
  });

  test("Rejeita fornecedor PF (400)", async () => {
    // Cria uma pessoa física
    const pfResp = await axios.post("http://localhost:3100/api/v1/entities", {
      name: "CLIENTE PF",
      entity_type: "PF",
      document_digits: "39053344705",
      document_pending: false,
    });
    const pf = pfResp.data;

    try {
      await axios.post("http://localhost:3100/api/v1/produtos", {
        nome: "Brinquedo",
        suppliers: [pf.id],
      });
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(String(error.response.data.error)).toMatch(/suppliers|PJ/i);
    }
  });
});
