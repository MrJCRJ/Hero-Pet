/**
 * @jest-environment node
 */
// tests/api/v1/estoque/movimentos-and-saldos.test.js
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";

jest.setTimeout(60000);

let produto;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const mig = await fetch("http://localhost:3000/api/v1/migrations", {
    method: "POST",
  });
  if (![200, 201].includes(mig.status)) {
    throw new Error(`Falha ao migrar schema estoque. status=${mig.status}`);
  }

  // cria produto base
  const p = await fetch("http://localhost:3000/api/v1/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Teste Estoque", categoria: "TESTE" }),
  });
  if (![200, 201].includes(p.status)) {
    throw new Error(`Falha seed produto base. status=${p.status}`);
  }
  produto = await p.json();
});

describe("Movimentos de Estoque e Saldos (TDD)", () => {
  test("ENTRADA compõe custo e aumenta saldo; SAIDA reduz; AJUSTE altera saldo; saldos consistentes", async () => {
    // ENTRADA 1: 10 un x 10.00 + frete 20 => valor_total=120, custo=12
    let resp = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produto_id: produto.id,
        tipo: "ENTRADA",
        quantidade: 10,
        valor_unitario: 10.0,
        frete: 20,
        outras_despesas: 0,
        documento: "NF-001",
      }),
    });
    expect([200, 201]).toContain(resp.status);
    let m1 = await resp.json();
    expect(m1).toHaveProperty("valor_total", "120.00");

    // ENTRADA 2: 5 un x 12.00 => valor_total=60, custo segue 12
    resp = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produto_id: produto.id,
        tipo: "ENTRADA",
        quantidade: 5,
        valor_unitario: 12.0,
        documento: "NF-002",
      }),
    });
    expect([200, 201]).toContain(resp.status);
    const m2 = await resp.json();
    expect(m2).toHaveProperty("valor_total", "60.00");

    // SAIDA: 3 un => saldo 12, custo_medio permanece 12
    resp = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto_id: produto.id, tipo: "SAIDA", quantidade: 3 }),
    });
    expect([200, 201]).toContain(resp.status);

    // AJUSTE: -2 => saldo 10
    resp = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto_id: produto.id, tipo: "AJUSTE", quantidade: -2 }),
    });
    expect([200, 201]).toContain(resp.status);

    // Consulta saldos
    const saldoResp = await fetch(
      `http://localhost:3000/api/v1/estoque/saldos?produto_id=${produto.id}`,
    );
    expect(saldoResp.status).toBe(200);
    const saldo = await saldoResp.json();
    expect(saldo).toHaveProperty("produto_id", produto.id);
    expect(saldo).toHaveProperty("saldo", "10.000");
    expect(saldo).toHaveProperty("custo_medio", "12.00");
    expect(saldo).toHaveProperty("ultimo_custo", "12.00");
  });

  test("Valida tipo inválido e quantidade para SAIDA", async () => {
    // tipo inválido
    let resp = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto_id: produto.id, tipo: "XYZ", quantidade: 1 }),
    });
    expect(resp.status).toBe(400);

    // SAIDA com quantidade negativa é inválido
    resp = await fetch("http://localhost:3000/api/v1/estoque/movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto_id: produto.id, tipo: "SAIDA", quantidade: -1 }),
    });
    expect(resp.status).toBe(400);
  });
});
