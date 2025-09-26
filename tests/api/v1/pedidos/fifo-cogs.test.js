/**
 * @jest-environment node
 */

// tests/api/v1/pedidos/fifo-cogs.test.js
// Objetivo: RED - garantir que custo dos itens em VENDA passe a refletir FIFO real (consumo por lotes),
// e não a média histórica global das entradas. Este teste irá falhar até implementarmos a lógica FIFO
// na criação de pedidos (POST /api/v1/pedidos) substituindo o cálculo atual baseado em SUM(valor_total)/SUM(qtd).

const BASE_URL = "http://localhost:3000";

async function api(method, path, body, expectOk = true, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (expectOk && !res.ok) {
    throw new Error(
      `API ${method} ${path} failed: ${res.status} ${JSON.stringify(data)}`,
    );
  }
  return { status: res.status, data };
}

function randomDigits(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

async function criaEntidade(tipo = "PF", nome = "Cliente FIFO") {
  const doc = randomDigits(tipo === "PF" ? 11 : 14);
  const { data } = await api("POST", "/api/v1/entities", {
    name: nome,
    entity_type: tipo,
    document_digits: doc,
    ativo: true,
  });
  return data;
}

async function criaProduto(nome = "Produto FIFO", precoTabela = 100) {
  // fornecedor
  const fornecedor = await criaEntidade("PJ", "Fornecedor FIFO");
  const { data } = await api("POST", "/api/v1/produtos", {
    nome,
    preco_tabela: precoTabela,
    ativo: true,
    fornecedor_id: fornecedor.id,
  });
  return data;
}

async function entradaFIFO(produtoId, quantidade, custoUnit, documento = null) {
  return api(
    "POST",
    "/api/v1/estoque/movimentos",
    {
      produto_id: produtoId,
      tipo: "ENTRADA",
      quantidade,
      valor_unitario: custoUnit,
      documento,
      fifo_enabled: 1, // força feature flag
    },
    true,
  );
}

async function criaPedidoVenda(clienteId, itens) {
  return api("POST", "/api/v1/pedidos", {
    tipo: "VENDA",
    partner_entity_id: clienteId,
    itens,
  });
}

async function getPedido(id) {
  return api("GET", `/api/v1/pedidos/${id}`);
}

describe("FIFO COGS em pedidos (RED)", () => {
  let cliente, produto;

  beforeAll(async () => {
    // garante migrações aplicadas (globalSetup já fez, mas redundância segura em ambiente isolado)
    await api("POST", "/api/v1/migrations", null, true);
    cliente = await criaEntidade("PF", "Cliente FIFO COGS");
    produto = await criaProduto("Racao FIFO", 200);
  });

  test("(1) Venda consome somente primeiro lote => custo_unit_venda = custo lote", async () => {
    await entradaFIFO(produto.id, 5, 10.0, "L1"); // lote 1 custo 10
    const { data: pedido } = await criaPedidoVenda(cliente.id, [
      { produto_id: produto.id, quantidade: 2, preco_unitario: 30 },
    ]);
    const { data: full } = await getPedido(pedido.id);
    const item = full.itens[0];
    // Esperado FIFO: custo_unit_venda = 10.00, custo_total_item = 20.00
    expect(Number(item.quantidade)).toBe(2);
    expect(Number(item.custo_unit_venda)).toBe(10); // RED: atualmente média global pode coincidir neste caso simples
    expect(Number(item.custo_total_item)).toBe(20);
  });

  test("(2) Venda atravessa dois lotes => custo_total_item = soma parcial por lote (FIFO)", async () => {
    // Lotes: primeiro já tem 3 restantes (5 - 2 vendidos). Adiciona segundo lote custo 14
    await entradaFIFO(produto.id, 4, 14.0, "L2"); // lote 2 custo 14
    // Vender 4: deveria consumir 3 remanescentes do lote1 (custo 10) + 1 do lote2 (custo 14)
    const { data: pedido } = await criaPedidoVenda(cliente.id, [
      { produto_id: produto.id, quantidade: 4, preco_unitario: 40 },
    ]);
    const { data: full } = await getPedido(pedido.id);
    const item = full.itens[0];
    // FIFO esperado: custo_total = 3*10 + 1*14 = 44 => custo_unit_venda arredondado = 11.00
    // Média histórica atual (legado) produziria ( (5*10 + 4*14) / (5+4) ) = (50 + 56)/9 = 11.777... arredondado 11.78
    // Então o teste falha até implementarmos FIFO, pois custo_unit_venda atual ~= 11.78 e custo_total_item ~= 47.12
    expect(Number(item.quantidade)).toBe(4);
    expect(Number(item.custo_total_item)).toBe(44); // RED: legado calculará diferente
    expect(Number(item.custo_unit_venda)).toBe(11); // 44 / 4
  });

  test("(3) Falta de estoque => pedido rejeitado (400)", async () => {
    // Estoque atual: após testes anteriores: Lote1 consumido 5 (2 + 3), Lote2 consumido 1 de 4 => restam 3 com custo 14.
    // Tentar vender 10 (maior que 3 disponíveis) deve falhar.
    const { status, data } = await api(
      "POST",
      "/api/v1/pedidos",
      {
        tipo: "VENDA",
        partner_entity_id: cliente.id,
        itens: [{ produto_id: produto.id, quantidade: 10, preco_unitario: 50 }],
      },
      false,
    );
    expect(status).toBe(400);
    expect(data.error || "").toMatch(/Saldo insuficiente/);
  });

  test("(4) Multi-produto isolamento de custos", async () => {
    const produtoB = await criaProduto("Produto B FIFO", 150);
    // Lotes produto A adicionais para clareza
    await entradaFIFO(produto.id, 2, 20.0, "L3A");
    // Lotes produto B
    await entradaFIFO(produtoB.id, 3, 5.0, "L1B");
    await entradaFIFO(produtoB.id, 2, 8.0, "L2B");

    // Venda combinada: A:2 unidades (deveria tirar do lote recente ou FIFO? -> sempre FIFO: ainda restam 3 do lote2 (14) + 2 lote3 (20) => consome 2 do lote2 a 14)
    //                    B:4 unidades (3 de 5 + 1 de 8 => custo total 23 => unit 5.75 arred 5.75 mas guardamos com 2 casas => 5.75)
    const { data: pedido } = await criaPedidoVenda(cliente.id, [
      { produto_id: produto.id, quantidade: 2, preco_unitario: 60 },
      { produto_id: produtoB.id, quantidade: 4, preco_unitario: 30 },
    ]);
    const { data: full } = await getPedido(pedido.id);
    const ia = full.itens.find((i) => i.produto_id === produto.id);
    const ib = full.itens.find((i) => i.produto_id === produtoB.id);

    // Produto A: estoque antes deste teste (após testes 1 e 2):
    //   Lote1: 5 inicial - 2 - 3 = 0
    //   Lote2: 4 inicial - 1 (teste 2) = 3 restantes
    // Após entrada L3A: +2 (lote3) => ordem FIFO disponível: Lote2(3 @14), Lote3(2 @20)
    // Venda 2 => custo_total = 2*14 = 28 custo_unit=14
    expect(Number(ia.custo_total_item)).toBe(28); // RED (legado média maior)
    expect(Number(ia.custo_unit_venda)).toBe(14);

    // Produto B: lotes: (3 @5), (2 @8) -> vende 4 => custo_total = 3*5 + 1*8 = 23 => unit = 5.75
    expect(Number(ib.custo_total_item)).toBe(23); // RED
    expect(Number(ib.custo_unit_venda)).toBeCloseTo(5.75, 2);
  });
});
