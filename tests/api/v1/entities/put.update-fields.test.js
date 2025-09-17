/**
 * @jest-environment node
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(35000);

/**
 * Este teste foca especificamente em atualizar campos recentemente adicionados:
 * numero, complemento, ativo. Reaproveita classify rules já cobertas em outros testes.
 */

let baseId;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  // recria schema para ambiente limpo
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha ao aplicar migrações. Status: ${mig.status}`);
  }
  // cria registro inicial
  const createRes = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "TESTE INICIAL",
      entity_type: "PF",
      document_digits: "",
      document_pending: true,
      numero: "10",
      complemento: "FRENTE",
      ativo: true,
    }),
  });
  const created = await createRes.json();
  baseId = created.id;
});

describe("PUT /api/v1/entities/:id atualização de numero/complemento/ativo", () => {
  test("Deve atualizar numero, complemento e desativar", async () => {
    const payload = {
      name: "TESTE INICIAL", // mantém nome
      entity_type: "PF",
      document_digits: "", // continua pendente
      document_pending: true,
      numero: "55A",
      complemento: "FUNDOS BLOCO B",
      ativo: false,
    };

    const res = await fetch(`http://localhost:3000/api/v1/entities/${baseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("id", baseId);
    expect(body).toHaveProperty("numero", payload.numero);
    expect(body).toHaveProperty("complemento", payload.complemento);
    expect(body).toHaveProperty("ativo", false);
  });

  test("Deve reativar e limpar complemento mantendo numero", async () => {
    const payload = {
      name: "TESTE INICIAL",
      entity_type: "PF",
      document_digits: "",
      document_pending: true,
      numero: "55A",
      complemento: "", // limpar
      ativo: true,
    };

    const res = await fetch(`http://localhost:3000/api/v1/entities/${baseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("ativo", true);
    expect(body).toHaveProperty("numero", payload.numero);
    expect(body.complemento === null || body.complemento === "").toBe(true);
  });
});
