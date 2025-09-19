/**
 * @jest-environment node
 */
// tests/api/v1/produtos/post.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(45000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  // Reset total do schema para previsibilidade
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  // Aplica todas as migrações conhecidas (entities + futuras de produtos)
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(
      `Falha ao aplicar migrações para testes de produtos. Status: ${mig.status}`,
    );
  }
});

describe("POST /api/v1/produtos (TDD)", () => {
  test("Cria produto simples sem fornecedor (201)", async () => {
    const payload = {
      nome: "Ração Premium 10kg",
      categoria: "RACOES",
      codigo_barras: null,
      ativo: true,
    };

    const resp = await fetch("http://localhost:3000/api/v1/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect([200, 201]).toContain(resp.status);
    const body = await resp.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("nome", payload.nome);
    expect(body).toHaveProperty("categoria", payload.categoria);
    expect(body).toHaveProperty("codigo_barras", null);
    expect(body).toHaveProperty("ativo", true);
    expect(body).toHaveProperty("created_at");
    expect(body).toHaveProperty("updated_at");
  });

  test("Cria produto com fornecedor PJ válido (201)", async () => {
    // Prepara fornecedor PJ via endpoint existente de entities
    const fornecedor = await (
      await fetch("http://localhost:3000/api/v1/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "FORNECEDOR TESTE LTDA",
          entity_type: "PJ",
          document_digits: "12345678000195", // cnpj qualquer (validade algorítmica não exigida aqui)
          document_pending: false,
        }),
      })
    ).json();

    const payload = {
      nome: "Areia Sanitária 4kg",
      categoria: "HIGIENE",
      fornecedor_id: fornecedor.id,
      preco_tabela: 29.9,
      markup_percent_default: 30.0,
    };

    const resp = await fetch("http://localhost:3000/api/v1/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect([200, 201]).toContain(resp.status);
    const body = await resp.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("fornecedor_id", fornecedor.id);
    expect(body).toHaveProperty("preco_tabela", "29.90");
    expect(body).toHaveProperty("markup_percent_default", "30.00");
  });

  test("Rejeita fornecedor PF (400)", async () => {
    // Cria uma pessoa física
    const pf = await (
      await fetch("http://localhost:3000/api/v1/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "CLIENTE PF",
          entity_type: "PF",
          document_digits: "39053344705",
          document_pending: false,
        }),
      })
    ).json();

    const resp = await fetch("http://localhost:3000/api/v1/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Brinquedo", fornecedor_id: pf.id }),
    });

    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body).toHaveProperty("error");
  });

  test("Unique parcial de codigo_barras (409)", async () => {
    const p1 = await fetch("http://localhost:3000/api/v1/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Coleira A", codigo_barras: "789000000001" }),
    });
    expect([200, 201]).toContain(p1.status);

    const p2 = await fetch("http://localhost:3000/api/v1/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Coleira B", codigo_barras: "789000000001" }),
    });
    expect(p2.status).toBe(409);
    const body2 = await p2.json();
    expect(body2).toHaveProperty("error");
  });
});
