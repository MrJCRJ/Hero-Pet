/**
 * @jest-environment node
 */
import orchestrator from "tests/orchestrator.js";
import database from "infra/database.js";
import { runMigrations } from "tests/utils/runMigrations.js";
import { BASE_URL } from "tests/utils/authHelpers.js";

jest.setTimeout(60000);

const API_KEY = "bot-test-key";

function withApiKey(extra = {}) {
  return {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
    ...extra,
  };
}

let produtoId = 0;
let clienteId = 0;
let outroClienteId = 0;

beforeAll(async () => {
  process.env.HEROPET_API_KEY = API_KEY;
  process.env.ALLOWED_BAIRROS = "centro,jardim europa";
  process.env.BOT_DELIVERY_WINDOW = "08:00-22:00";
  process.env.DELIVERY_START_TIME = "08:00";
  process.env.DELIVERY_END_TIME = "22:00";

  await orchestrator.waitForAllServices();
  await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await runMigrations();

  const produto = await database.query({
    text: `INSERT INTO produtos
           (nome, categoria, preco_tabela, preco_kg_granel, venda_granel, ativo, created_at, updated_at)
           VALUES ('Racao Granel Premium', 'RACAO_GRANEL', 25.50, 25.50, true, true, NOW(), NOW())
           RETURNING id`,
  });
  produtoId = Number(produto.rows[0].id);

  await database.query({
    text: `INSERT INTO movimento_estoque
           (produto_id, tipo, quantidade, valor_unitario, valor_total, documento, observacao, origem_tipo, data_movimento)
           VALUES ($1, 'ENTRADA', 20, 10, 200, 'SEED-BOT', 'Seed bot test', 'MANUAL', NOW())`,
    values: [produtoId],
  });
  await database.query({
    text: `INSERT INTO estoque_lote
           (produto_id, quantidade_inicial, quantidade_disponivel, custo_unitario, valor_total, origem_tipo, data_entrada, documento, observacao)
           VALUES ($1, 20, 20, 10, 200, 'ENTRADA', NOW(), 'SEED-BOT', 'Seed lot')`,
    values: [produtoId],
  });
});

describe("API Bot endpoints", () => {
  test("retorna 401 sem chave de API", async () => {
    const response = await fetch(`${BASE_URL}/api/bot/produtos`);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  test("retorna 401 com chave invalida", async () => {
    const response = await fetch(`${BASE_URL}/api/bot/produtos`, {
      headers: { "X-API-Key": "invalid" },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  test("healthcheck responde 200 com chave valida", async () => {
    const response = await fetch(`${BASE_URL}/api/bot/health`, {
      headers: { "X-API-Key": API_KEY },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("cria ou encontra cliente por telefone", async () => {
    const create = await fetch(`${BASE_URL}/api/bot/clientes`, {
      method: "POST",
      headers: withApiKey(),
      body: JSON.stringify({
        telefone: "11988887777",
        nome: "Cliente Bot",
      }),
    });
    expect([200, 201]).toContain(create.status);
    const created = await create.json();
    expect(created).toHaveProperty("id");
    expect(created).toHaveProperty("telefone", "11988887777");
    clienteId = Number(created.id);

    const second = await fetch(`${BASE_URL}/api/bot/clientes`, {
      method: "POST",
      headers: withApiKey(),
      body: JSON.stringify({
        telefone: "11988887777",
      }),
    });
    expect(second.status).toBe(200);
    const existing = await second.json();
    expect(existing.id).toBe(clienteId);
  });

  test("bloqueia bairro nao permitido", async () => {
    const response = await fetch(`${BASE_URL}/api/bot/enderecos`, {
      method: "POST",
      headers: withApiKey(),
      body: JSON.stringify({
        cliente_id: clienteId,
        logradouro: "Rua A",
        numero: "100",
        bairro: "bairro proibido",
        cidade: "Sao Paulo",
        uf: "SP",
        cep: "01001000",
      }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Bairro nao permitido" });
  });

  test("salva endereco permitido", async () => {
    const response = await fetch(`${BASE_URL}/api/bot/enderecos`, {
      method: "POST",
      headers: withApiKey(),
      body: JSON.stringify({
        cliente_id: clienteId,
        logradouro: "Rua B",
        numero: "200",
        bairro: "Centro",
        cidade: "Sao Paulo",
        uf: "SP",
        cep: "01002000",
      }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cliente_id).toBe(clienteId);
    expect(body.bairro).toBe("Centro");
  });

  test("lista produtos e consulta estoque", async () => {
    const produtosRes = await fetch(`${BASE_URL}/api/bot/produtos?granel=true`, {
      headers: { "X-API-Key": API_KEY },
    });
    expect(produtosRes.status).toBe(200);
    const produtos = await produtosRes.json();
    expect(Array.isArray(produtos)).toBe(true);
    const found = produtos.find((p) => p.id === produtoId);
    expect(found).toBeTruthy();
    expect(found.preco_kg).toBeGreaterThan(0);
    expect(found.estoque_kg).toBeGreaterThan(0);
    expect(typeof found.margem_percentual).toBe("number");
    expect(typeof found.is_best_seller).toBe("boolean");
    expect(found.ativo).toBe(true);
    expect(found.granel).toBe(true);

    const estoqueRes = await fetch(`${BASE_URL}/api/bot/estoque?produto_id=${produtoId}`, {
      headers: { "X-API-Key": API_KEY },
    });
    expect(estoqueRes.status).toBe(200);
    const estoque = await estoqueRes.json();
    expect(estoque).toMatchObject({ produto_id: produtoId });
    expect(estoque.estoque_kg).toBeGreaterThan(0);
  });

  test("retorna cliente por telefone com historico e 404 quando inexistente", async () => {
    const notFound = await fetch(`${BASE_URL}/api/bot/clientes?telefone=551188887777`, {
      headers: { "X-API-Key": API_KEY },
    });
    expect(notFound.status).toBe(404);
    expect(await notFound.json()).toEqual({ error: "Cliente não encontrado" });

    const found = await fetch(`${BASE_URL}/api/bot/clientes?telefone=11988887777`, {
      headers: { "X-API-Key": API_KEY },
    });
    expect(found.status).toBe(200);
    const body = await found.json();
    expect(body).toHaveProperty("id", clienteId);
    expect(Array.isArray(body.enderecos)).toBe(true);
    expect(Array.isArray(body.ultimos_pedidos)).toBe(true);
  });

  test("cria pedido com sucesso", async () => {
    const response = await fetch(`${BASE_URL}/api/bot/pedidos`, {
      method: "POST",
      headers: withApiKey(),
      body: JSON.stringify({
        cliente_id: clienteId,
        endereco_id: clienteId,
        forma_pagamento: "pix",
        horario_entrega: "10:30",
        itens: [
          {
            produto_id: produtoId,
            quantidade_kg: 2,
            preco_unitario_kg: 30,
          },
        ],
      }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("status", "confirmado");
    expect(body.total).toBeGreaterThan(0);
    expect(body.total_liquido).toBeGreaterThan(0);
  });

  test("retorna erro para endereco que nao pertence ao cliente", async () => {
    const createOther = await fetch(`${BASE_URL}/api/bot/clientes`, {
      method: "POST",
      headers: withApiKey(),
      body: JSON.stringify({
        telefone: "11977776666",
        nome: "Outro Cliente",
      }),
    });
    const otherBody = await createOther.json();
    outroClienteId = Number(otherBody.id);

    await fetch(`${BASE_URL}/api/bot/enderecos`, {
      method: "POST",
      headers: withApiKey(),
      body: JSON.stringify({
        cliente_id: outroClienteId,
        logradouro: "Rua C",
        numero: "10",
        bairro: "Centro",
        cidade: "Sao Paulo",
        uf: "SP",
        cep: "01003000",
      }),
    });

    const response = await fetch(`${BASE_URL}/api/bot/pedidos`, {
      method: "POST",
      headers: withApiKey(),
      body: JSON.stringify({
        cliente_id: clienteId,
        endereco_id: outroClienteId,
        forma_pagamento: "pix",
        horario_entrega: "11:00",
        itens: [
          {
            produto_id: produtoId,
            quantidade_kg: 1,
            preco_unitario_kg: 30,
          },
        ],
      }),
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Endereco nao pertence ao cliente" });
  });

  test("retorna erro para estoque insuficiente", async () => {
    const response = await fetch(`${BASE_URL}/api/bot/pedidos`, {
      method: "POST",
      headers: withApiKey(),
      body: JSON.stringify({
        cliente_id: clienteId,
        endereco_id: clienteId,
        forma_pagamento: "pix",
        horario_entrega: "12:00",
        itens: [
          {
            produto_id: produtoId,
            quantidade_kg: 9999,
            preco_unitario_kg: 30,
          },
        ],
      }),
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Estoque insuficiente" });
  });

  test("retorna 400 em pedido com bairro fora da area permitida", async () => {
    await database.query({
      text: `UPDATE entities
             SET observacao = $1
             WHERE id = $2`,
      values: [
        `BOT_ADDR::${JSON.stringify({
          logradouro: "Rua X",
          numero: "10",
          bairro: "bairro proibido",
          cidade: "Sao Paulo",
          uf: "SP",
          cep: "01001000",
        })}`,
        clienteId,
      ],
    });
    const response = await fetch(`${BASE_URL}/api/bot/pedidos`, {
      method: "POST",
      headers: withApiKey(),
      body: JSON.stringify({
        cliente_id: clienteId,
        endereco_id: clienteId,
        forma_pagamento: "pix",
        horario_entrega: "20:00",
        itens: [
          {
            produto_id: produtoId,
            quantidade_kg: 1,
            preco_unitario_kg: 30,
          },
        ],
      }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Bairro nao permitido" });
  });

  test("retorna sugestoes e lista de pedidos", async () => {
    const sug = await fetch(`${BASE_URL}/api/bot/sugestoes`, {
      headers: { "X-API-Key": API_KEY },
    });
    expect(sug.status).toBe(200);
    const sugBody = await sug.json();
    expect(Array.isArray(sugBody.top_vendas)).toBe(true);
    expect(Array.isArray(sugBody.top_margem)).toBe(true);

    const list = await fetch(`${BASE_URL}/api/bot/pedidos`, {
      headers: { "X-API-Key": API_KEY },
    });
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(Array.isArray(listBody)).toBe(true);
    if (listBody.length) {
      expect(listBody[0]).toHaveProperty("itens");
    }
  });
});
