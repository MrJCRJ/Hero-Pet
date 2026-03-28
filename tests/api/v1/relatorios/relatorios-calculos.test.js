/**
 * @jest-environment node
 *
 * Valida cálculos dos relatórios (DRE, ranking vendas, margem por produto)
 * contra um cenário com venda confirmada e COGS conhecido — alinhado ao golden dataset.
 *
 * Pré-requisitos (igual à suíte `tests/api/v1/pedidos/*`):
 * - `.env.test` com banco dedicado (ver `.env.test.sample`); não usar produção.
 * - `docker compose -f infra/compose.yaml up -d`: o serviço expõe Postgres em **5433** → use
 *   `POSTGRES_PORT=5433` (e credenciais alinhadas ao compose) se o app não conectar em 5432.
 * - Porta 3000 com Next respondendo `GET /api/v1/status` **200** (o orchestrator falha com 503 se o DB estiver inacessível).
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";
import { runMigrations } from "tests/utils/runMigrations.js";
import {
  getAuthenticatedCookie,
  BASE_URL,
} from "tests/utils/authHelpers.js";
import { RelatorioConsolidadoSchema } from "tests/schemas/relatorioConsolidadoSchema";

jest.setTimeout(90000);

let cookie;

function randomDigits(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

async function criaParceiroPF(nome = "Cliente QA Rel") {
  const resp = await fetch(`${BASE_URL}/api/v1/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      name: nome,
      entity_type: "PF",
      document_digits: randomDigits(11),
      document_pending: false,
      ativo: true,
    }),
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}

async function criaParceiroPJ(nome = "Forn QA Rel") {
  const resp = await fetch(`${BASE_URL}/api/v1/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name: nome, entity_type: "PJ" }),
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}

async function criaProduto(nome = "Prod QA Rel", preco = 20) {
  const forn = await criaParceiroPJ("FORN QA REL");
  const resp = await fetch(`${BASE_URL}/api/v1/produtos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      nome,
      preco_tabela: preco,
      ativo: true,
      suppliers: [forn.id],
    }),
  });
  expect([200, 201]).toContain(resp.status);
  return resp.json();
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations();
  cookie = await getAuthenticatedCookie();

  const cliente = await criaParceiroPF();
  const prod = await criaProduto("Racao QA", 20);

  const entrada = await fetch(`${BASE_URL}/api/v1/estoque/movimentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      produto_id: prod.id,
      tipo: "ENTRADA",
      quantidade: 5,
      valor_unitario: 10,
    }),
  });
  expect([200, 201]).toContain(entrada.status);

  const venda = await fetch(`${BASE_URL}/api/v1/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      partner_name: cliente.name,
      itens: [{ produto_id: prod.id, quantidade: 3, preco_unitario: 20 }],
    }),
  });
  expect([200, 201]).toContain(venda.status);
  const pedido = await venda.json();

  const getPedido = await fetch(`${BASE_URL}/api/v1/pedidos/${pedido.id}`, {
    headers: { Cookie: cookie },
  });
  const pedBody = await getPedido.json();
  expect(Number(pedBody.itens[0].custo_total_item)).toBe(30);
});

function currentMesAno() {
  const d = new Date();
  return { mes: d.getMonth() + 1, ano: d.getFullYear() };
}

describe("GET /api/v1/relatorios/dre", () => {
  test("DRE: receitas, COGS e lucros batem com venda 60 / COGS 30", async () => {
    const { mes, ano } = currentMesAno();
    const res = await fetch(
      `${BASE_URL}/api/v1/relatorios/dre?mes=${mes}&ano=${ano}`,
      { headers: { Cookie: cookie } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.dre).toBeDefined();
    expect(Number(json.dre.receitas)).toBe(60);
    expect(Number(json.dre.custosVendas)).toBe(30);
    expect(Number(json.dre.lucroBruto)).toBe(30);
    expect(Number(json.dre.lucroOperacional)).toBe(30);
    expect(Number(json.dre.margemBruta)).toBe(50);
    expect(json.periodo).toMatchObject({ mes, ano });
  });
});

describe("GET /api/v1/relatorios/ranking (vendas)", () => {
  test("totalGeral, pedidos e ticket médio coerentes", async () => {
    const { mes, ano } = currentMesAno();
    const res = await fetch(
      `${BASE_URL}/api/v1/relatorios/ranking?mes=${mes}&ano=${ano}&tipo=vendas`,
      { headers: { Cookie: cookie } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tipo).toBe("vendas");
    expect(Number(json.totalGeral)).toBe(60);
    expect(Number(json.totalPedidosGeral)).toBe(1);
    expect(Number(json.ticketMedioGeral)).toBe(60);
    expect(Array.isArray(json.ranking)).toBe(true);
    if (json.ranking.length > 0) {
      const top = json.ranking[0];
      expect(Number(top.total)).toBe(60);
      expect(Number(top.pedidos_count)).toBe(1);
      expect(Number(top.ticketMedio)).toBe(60);
      expect(Number(top.participacaoTotal)).toBe(100);
    }
  });
});

describe("GET /api/v1/relatorios/margem-produto", () => {
  test("item único: receita, cogs, margem e participação 100%", async () => {
    const { mes, ano } = currentMesAno();
    const res = await fetch(
      `${BASE_URL}/api/v1/relatorios/margem-produto?mes=${mes}&ano=${ano}`,
      { headers: { Cookie: cookie } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.itens)).toBe(true);
    expect(json.itens.length).toBeGreaterThanOrEqual(1);
    const linha = json.itens[0];
    expect(Number(linha.receita)).toBe(60);
    expect(Number(linha.cogs)).toBe(30);
    expect(Number(linha.lucro)).toBe(30);
    expect(Number(linha.margem)).toBe(50);
    expect(Number(linha.participacaoVendas)).toBe(100);
    expect(Number(json.totalReceita)).toBe(60);
  });
});

describe("GET /api/v1/relatorios/fluxo-caixa", () => {
  test("retorna 200 e totais coerentes com cenário simples", async () => {
    const { mes, ano } = currentMesAno();
    const res = await fetch(
      `${BASE_URL}/api/v1/relatorios/fluxo-caixa?mes=${mes}&ano=${ano}`,
      { headers: { Cookie: cookie } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fluxo).toBeDefined();
    expect(json.fluxo).toHaveProperty("entradas");
    expect(json.fluxo).toHaveProperty("saidas");
    expect(json.fluxo).toHaveProperty("saldoInicial");
    expect(json.fluxo).toHaveProperty("saldoFinal");
    expect(Number(json.fluxo.entradas.vendas)).toBe(60);
    expect(Number(json.fluxo.saidas.compras)).toBe(0);
  });
});

describe("GET /api/v1/relatorios/consolidado", () => {
  test("JSON consolidado retorna 200 com schema válido", async () => {
    const { mes, ano } = currentMesAno();
    const res = await fetch(
      `${BASE_URL}/api/v1/relatorios/consolidado?mes=${mes}&ano=${ano}&format=json`,
      { headers: { Cookie: cookie } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Number(json.dre.receitas)).toBe(60);
    expect(Number(json.dre.custos_vendas)).toBe(30);
    expect(Number(json.dre.lucro_bruto)).toBe(30);
    expect(RelatorioConsolidadoSchema.safeParse(json).success).toBe(true);
  });
});

describe("GET /api/v1/relatorios/indicadores", () => {
  test("retorna indicadores com período", async () => {
    const { mes, ano } = currentMesAno();
    const res = await fetch(
      `${BASE_URL}/api/v1/relatorios/indicadores?mes=${mes}&ano=${ano}`,
      { headers: { Cookie: cookie } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.indicadores).toBeDefined();
    expect(json.periodo).toHaveProperty("diasPeriodo");
  });
});

describe("validação de parâmetros e depreciação", () => {
  test("retorna 400 para mes inválido", async () => {
    const res = await fetch(
      `${BASE_URL}/api/v1/relatorios/dre?mes=abc&ano=2025`,
      { headers: { Cookie: cookie } },
    );
    expect(res.status).toBe(400);
  });

  test("retorna 400 + header de depreciação para format=pdf", async () => {
    const { mes, ano } = currentMesAno();
    const res = await fetch(
      `${BASE_URL}/api/v1/relatorios/ranking?mes=${mes}&ano=${ano}&format=pdf`,
      { headers: { Cookie: cookie } },
    );
    expect(res.status).toBe(400);
    expect(res.headers.get("deprecation")).toBe("true");
  });
});
