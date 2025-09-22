/**
 * @jest-environment node
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

async function createEntityPJ(name, cnpjDigits) {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      entity_type: "PJ",
      document_digits: cnpjDigits,
      document_pending: false,
      ativo: true,
    }),
  });
  if (resp.status !== 201) {
    const t = await resp.text();
    throw new Error(`seed PJ fail: ${resp.status} ${t}`);
  }
  return resp.json();
}

async function createEntityPF(name, cpfDigits) {
  const resp = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      entity_type: "PF",
      document_digits: cpfDigits,
      document_pending: false,
      ativo: true,
    }),
  });
  if (resp.status !== 201) {
    const t = await resp.text();
    throw new Error(`seed PF fail: ${resp.status} ${t}`);
  }
  return resp.json();
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status))
    throw new Error(`migrations fail: ${mig.status}`);
});

describe("Produtos - suppliers e fields=id-nome (integração)", () => {
  let pj1, pj2, pf1;
  let pA;

  beforeAll(async () => {
    pj1 = await createEntityPJ("FORN PJ 1 LTDA", "11223344000110");
    pj2 = await createEntityPJ("FORN PJ 2 LTDA", "22334455000106");
    pf1 = await createEntityPF("CLIENTE PF 1", "39053344705");

    // Produto A: legacy fornecedor_id = pj1
    {
      const resp = await fetch("http://localhost:3000/api/v1/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "Produto A", fornecedor_id: pj1.id }),
      });
      if (![200, 201].includes(resp.status)) {
        const t = await resp.text();
        throw new Error(`seed Produto A fail: ${resp.status} ${t}`);
      }
      pA = await resp.json();
    }

    // Produto B: suppliers = [pj2]
    {
      const resp = await fetch("http://localhost:3000/api/v1/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: "Produto B", suppliers: [pj2.id] }),
      });
      if (![200, 201].includes(resp.status)) {
        const t = await resp.text();
        throw new Error(`seed Produto B fail: ${resp.status} ${t}`);
      }
      // não precisamos do corpo aqui
      await resp.json();
    }

    // Produto C: fornecedor_id = pj1 + suppliers = [pj2]
    {
      const resp = await fetch("http://localhost:3000/api/v1/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: "Produto C",
          fornecedor_id: pj1.id,
          suppliers: [pj2.id],
        }),
      });
      if (![200, 201].includes(resp.status)) {
        const t = await resp.text();
        throw new Error(`seed Produto C fail: ${resp.status} ${t}`);
      }
      // não precisamos do corpo aqui
      await resp.json();
    }
  });

  test("POST rejeita suppliers contendo PF (400)", async () => {
    const bad = await fetch("http://localhost:3000/api/v1/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "Produto X", suppliers: [pf1.id] }),
    });
    expect(bad.status).toBe(400);
    const body = await bad.json();
    expect(body).toHaveProperty("error");
  });

  test("GET sem fields expande suppliers e supplier_labels", async () => {
    const resp = await fetch("http://localhost:3000/api/v1/produtos");
    expect(resp.status).toBe(200);
    const list = await resp.json();
    const byName = Object.fromEntries(list.map((x) => [x.nome, x]));

    expect(byName["Produto A"].suppliers).toEqual(expect.arrayContaining([pj1.id]));
    expect(byName["Produto C"].suppliers).toEqual(
      expect.arrayContaining([pj1.id, pj2.id]),
    );
    expect(Array.isArray(byName["Produto B"].supplier_labels)).toBe(true);
    expect(byName["Produto C"].supplier_labels.some((s) => s.name.includes("PJ 2"))).toBe(true);
  });

  test("GET filtra por supplier_id (legacy ou junção)", async () => {
    const r1 = await fetch(
      `http://localhost:3000/api/v1/produtos?supplier_id=${pj1.id}`,
    );
    expect(r1.status).toBe(200);
    const l1 = await r1.json();
    expect(l1.length).toBeGreaterThanOrEqual(2); // A e C
    expect(l1.every((p) => (p.suppliers || []).includes(pj1.id))).toBe(true);

    const r2 = await fetch(
      `http://localhost:3000/api/v1/produtos?supplier_id=${pj2.id}`,
    );
    expect(r2.status).toBe(200);
    const l2 = await r2.json();
    expect(l2.length).toBeGreaterThanOrEqual(2); // B e C
    expect(l2.every((p) => (p.suppliers || []).includes(pj2.id))).toBe(true);
  });

  test("GET fields=id-nome retorna somente id e nome", async () => {
    const resp = await fetch(
      "http://localhost:3000/api/v1/produtos?fields=id-nome&limit=5",
    );
    expect(resp.status).toBe(200);
    const list = await resp.json();
    expect(Array.isArray(list)).toBe(true);
    for (const item of list) {
      expect(Object.keys(item).sort()).toEqual(["id", "nome"]);
    }
  });

  test("PUT não permite remover todos os fornecedores (regra mínima)", async () => {
    const resp = await fetch(
      `http://localhost:3000/api/v1/produtos/${pA.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fornecedor_id: null, suppliers: [] }),
      },
    );
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body).toHaveProperty("error");
  });

  test("PUT atualiza suppliers corretamente (troca pj1 -> pj2)", async () => {
    const resp = await fetch(
      `http://localhost:3000/api/v1/produtos/${pA.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fornecedor_id: null, suppliers: [pj2.id] }),
      },
    );
    expect(resp.status).toBe(200);
    const updated = await resp.json();
    expect(updated).toHaveProperty("id", pA.id);

    const check = await fetch(
      `http://localhost:3000/api/v1/produtos?supplier_id=${pj2.id}`,
    );
    const list = await check.json();
    expect(list.some((p) => p.id === pA.id)).toBe(true);
  });
});
