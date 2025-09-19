/**
 * @jest-environment node
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(45000);

async function postProduto(body) {
  const resp = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  return { status: resp.status, json };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha ao migrar schema. status=${mig.status}`);
  }
});

describe("PUT/DELETE /api/v1/produtos/:id", () => {
  test("PUT atualiza campos básicos", async () => {
    const created = await postProduto({ nome: "Produto X", categoria: "X" });
    expect([200, 201]).toContain(created.status);
    const id = created.json.id;
    const resp = await fetch(`http://localhost:3000/api/v1/produtos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Produto Y", categoria: "Y", ativo: false }),
    });
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty("nome", "Produto Y");
    expect(body).toHaveProperty("categoria", "Y");
    expect(body).toHaveProperty("ativo", false);
  });

  test("PUT valida unique de codigo_barras", async () => {
    const a = await postProduto({ nome: "A", codigo_barras: "789A" });
    const b = await postProduto({ nome: "B" });
    const resp = await fetch(`http://localhost:3000/api/v1/produtos/${b.json.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "B2", codigo_barras: a.json.codigo_barras }),
    });
    expect(resp.status).toBe(409);
    const err = await resp.json();
    expect(err).toHaveProperty("error");
  });

  test("DELETE inativa (soft delete)", async () => {
    const created = await postProduto({ nome: "Para Deletar" });
    const id = created.json.id;
    const del = await fetch(`http://localhost:3000/api/v1/produtos/${id}`, {
      method: "DELETE",
    });
    expect(del.status).toBe(200);
    const body = await del.json();
    expect(body).toHaveProperty("ativo", false);
  });
});
