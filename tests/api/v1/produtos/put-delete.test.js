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
  // fornecedor PJ para associar
  const forn = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "FORNECEDOR PUT LTDA",
      entity_type: "PJ",
      document_digits: "11222333000182",
      document_pending: false,
      ativo: true,
    }),
  });
  if (forn.status !== 201)
    throw new Error(`seed fornecedor PUT fail: ${forn.status}`);
  global.__FORN_ID__ = (await forn.json()).id;
});

describe("PUT/DELETE /api/v1/produtos/:id", () => {
  test("PUT atualiza campos básicos", async () => {
    const created = await postProduto({
      nome: "Produto X",
      categoria: "X",
      fornecedor_id: global.__FORN_ID__,
    });
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
    const a = await postProduto({
      nome: "A",
      codigo_barras: "789A",
      fornecedor_id: global.__FORN_ID__,
    });
    const b = await postProduto({
      nome: "B",
      fornecedor_id: global.__FORN_ID__,
    });
    const resp = await fetch(
      `http://localhost:3000/api/v1/produtos/${b.json.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: "B2",
          codigo_barras: a.json.codigo_barras,
        }),
      },
    );
    expect(resp.status).toBe(409);
    const err = await resp.json();
    expect(err).toHaveProperty("error");
  });

  test("DELETE inativa (soft delete)", async () => {
    const created = await postProduto({
      nome: "Para Deletar",
      fornecedor_id: global.__FORN_ID__,
    });
    const id = created.json.id;
    const del = await fetch(`http://localhost:3000/api/v1/produtos/${id}`, {
      method: "DELETE",
    });
    expect(del.status).toBe(200);
    const body = await del.json();
    expect(body).toHaveProperty("ativo", false);
  });
});
