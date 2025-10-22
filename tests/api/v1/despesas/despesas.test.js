/**
 * @jest-environment node
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha ao aplicar migrações. Status: ${mig.status}`);
  }
});

describe("GET /api/v1/despesas", () => {
  test("Retorna lista vazia inicialmente", async () => {
    const response = await fetch("http://localhost:3000/api/v1/despesas");
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
  });
});

describe("POST /api/v1/despesas", () => {
  test("Cria nova despesa com sucesso", async () => {
    const despesa = {
      descricao: "Aluguel Janeiro",
      categoria: "aluguel",
      valor: 1500.0,
      data_vencimento: "2025-01-10",
      status: "pendente",
    };

    const response = await fetch("http://localhost:3000/api/v1/despesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(despesa),
    });

    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.id).toBeDefined();
    expect(result.descricao).toBe("Aluguel Janeiro");
    expect(result.categoria).toBe("aluguel");
    expect(parseFloat(result.valor)).toBe(1500.0);
    expect(result.status).toBe("pendente");
  });

  test("Retorna erro ao criar despesa sem descrição", async () => {
    const despesa = {
      categoria: "energia",
      valor: 200.0,
      data_vencimento: "2025-01-15",
    };

    const response = await fetch("http://localhost:3000/api/v1/despesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(despesa),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toContain("Descrição");
  });

  test("Retorna erro ao criar despesa com valor inválido", async () => {
    const despesa = {
      descricao: "Teste",
      categoria: "outros",
      valor: -100,
      data_vencimento: "2025-01-15",
    };

    const response = await fetch("http://localhost:3000/api/v1/despesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(despesa),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toContain("Valor");
  });
});

describe("GET /api/v1/despesas com filtros", () => {
  beforeAll(async () => {
    // Criar algumas despesas para testar filtros
    const despesas = [
      {
        descricao: "Energia Janeiro",
        categoria: "energia",
        valor: 300.0,
        data_vencimento: "2025-01-15",
        status: "pendente",
      },
      {
        descricao: "Água Janeiro",
        categoria: "agua",
        valor: 150.0,
        data_vencimento: "2025-01-20",
        status: "pago",
        data_pagamento: "2025-01-18",
      },
      {
        descricao: "Internet Fevereiro",
        categoria: "internet",
        valor: 100.0,
        data_vencimento: "2025-02-10",
        status: "pendente",
      },
    ];

    for (const d of despesas) {
      await fetch("http://localhost:3000/api/v1/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
    }
  });

  test("Filtra despesas por categoria", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/despesas?categoria=energia",
    );
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((d) => d.categoria === "energia")).toBe(true);
  });

  test("Filtra despesas por status", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/despesas?status=pago",
    );
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.every((d) => d.status === "pago")).toBe(true);
  });

  test("Filtra despesas por mês/ano", async () => {
    const response = await fetch(
      "http://localhost:3000/api/v1/despesas?mes=2&ano=2025",
    );
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.data.length).toBeGreaterThan(0);
  });
});

describe("PUT /api/v1/despesas/:id", () => {
  let despesaId;

  beforeAll(async () => {
    const response = await fetch("http://localhost:3000/api/v1/despesas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao: "Despesa para atualizar",
        categoria: "outros",
        valor: 100.0,
        data_vencimento: "2025-01-25",
        status: "pendente",
      }),
    });
    const result = await response.json();
    despesaId = result.id;
  });

  test("Atualiza despesa com sucesso", async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/despesas/${despesaId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pago",
          data_pagamento: "2025-01-24",
        }),
      },
    );

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.status).toBe("pago");
    // A data vem no formato ISO do banco
    expect(result.data_pagamento).toContain("2025-01-24");
  });
});

describe("DELETE /api/v1/despesas/:id", () => {
  test("Exclui despesa com sucesso", async () => {
    // Criar despesa para excluir
    const createResponse = await fetch(
      "http://localhost:3000/api/v1/despesas",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: "Despesa para excluir",
          categoria: "outros",
          valor: 50.0,
          data_vencimento: "2025-01-30",
        }),
      },
    );
    const created = await createResponse.json();

    const deleteResponse = await fetch(
      `http://localhost:3000/api/v1/despesas/${created.id}`,
      {
        method: "DELETE",
      },
    );

    expect(deleteResponse.status).toBe(200);

    // Verificar que foi excluída
    const getResponse = await fetch(
      `http://localhost:3000/api/v1/despesas/${created.id}`,
    );
    expect(getResponse.status).toBe(404);
  });
});
