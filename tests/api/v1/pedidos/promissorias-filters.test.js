/**
 * @jest-environment node
 */

const BASE_URL = "http://localhost:3000";

async function api(path, expectOk = true) {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await res.json().catch(() => ({}));
  if (expectOk && !res.ok) {
    throw new Error(
      `GET ${path} failed: ${res.status} ${JSON.stringify(data)}`,
    );
  }
  return { status: res.status, data };
}

describe("API /pedidos/promissorias - filtros e aliases", () => {
  test("status=atrasadas e alias atrasados retornam mesma lista", async () => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM corrente
    const a = await api(
      `/api/v1/pedidos/promissorias?month=${month}&status=atrasadas`,
    );
    const b = await api(
      `/api/v1/pedidos/promissorias?month=${month}&status=atrasados`,
    );
    expect(Array.isArray(a.data)).toBe(true);
    expect(Array.isArray(b.data)).toBe(true);
    expect(b.data).toEqual(a.data);
  });

  test("status=pendentes funciona e alias pendente é normalizado", async () => {
    const month = new Date().toISOString().slice(0, 7);
    const pendPlural = await api(
      `/api/v1/pedidos/promissorias?month=${month}&status=pendentes`,
    );
    const pendSing = await api(
      `/api/v1/pedidos/promissorias?month=${month}&status=pendente`,
    );
    expect(Array.isArray(pendPlural.data)).toBe(true);
    expect(pendSing.data).toEqual(pendPlural.data);
  });

  test("status=proximo e aliases proximo_mes, proximo-mes equivalem", async () => {
    const month = new Date().toISOString().slice(0, 7);
    const base = await api(
      `/api/v1/pedidos/promissorias?month=${month}&status=proximo`,
    );
    const alias1 = await api(
      `/api/v1/pedidos/promissorias?month=${month}&status=proximo_mes`,
    );
    const alias2 = await api(
      `/api/v1/pedidos/promissorias?month=${month}&status=proximo-mes`,
    );
    expect(alias1.data).toEqual(base.data);
    expect(alias2.data).toEqual(base.data);
  });

  test("status=carry e aliases meses_anteriores, carry_over equivalem", async () => {
    const month = new Date().toISOString().slice(0, 7);
    const base = await api(
      `/api/v1/pedidos/promissorias?month=${month}&status=carry`,
    );
    const alias1 = await api(
      `/api/v1/pedidos/promissorias?month=${month}&status=meses_anteriores`,
    );
    const alias2 = await api(
      `/api/v1/pedidos/promissorias?month=${month}&status=carry_over`,
    );
    expect(alias1.data).toEqual(base.data);
    expect(alias2.data).toEqual(base.data);
  });

  test("status inválido retorna 400 e inclui metadados de erro", async () => {
    const month = new Date().toISOString().slice(0, 7);
    const res = await fetch(
      `/api/v1/pedidos/promissorias?month=${month}&status=foo_bar`,
    );
    const data = await res.json().catch(() => ({}));
    expect(res.status).toBe(400);
    expect(data).toHaveProperty("error");
    expect(data).toHaveProperty("allowed");
    expect(data).toHaveProperty("aliases");
  });
});
