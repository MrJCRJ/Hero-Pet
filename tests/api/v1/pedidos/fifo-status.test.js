// tests/api/v1/pedidos/fifo-status.test.js
// @jest-environment node
// Verifica exposição de flag fifo_aplicado em pedidos (GET lista e GET /:id) antes e depois de migrar_fifo.
import database from "infra/database";

const base = "http://localhost:3000/api/v1";

async function criaEntity(nome = "CLI FIFO FLAG") {
  const r = await fetch(`${base}/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, entity_type: "PF" }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("entity " + JSON.stringify(j));
  return j.id;
}
async function criaFornecedor(nome = "FORN FIFO FLAG") {
  const r = await fetch(`${base}/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, entity_type: "PJ" }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("forn " + JSON.stringify(j));
  return j.id;
}
async function criaProduto(nome, fornId) {
  const r = await fetch(`${base}/produtos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, fornecedor_id: fornId, preco_tabela: 100 }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("prod " + JSON.stringify(j));
  return j.id;
}

async function criaPedidoLegacy(produtoId, clienteId) {
  // Cria entrada legacy (sem lotes FIFO) e depois pedido VENDA que usará média legacy
  const ent = await fetch(`${base}/estoque/movimentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: produtoId,
      tipo: "ENTRADA",
      quantidade: 10,
      valor_unitario: 20,
      documento: "LEG-FLAG-1",
    }),
  });
  if (!ent.ok) throw new Error("entrada legacy");
  const ped = await fetch(`${base}/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo: "VENDA",
      partner_entity_id: clienteId,
      itens: [{ produto_id: produtoId, quantidade: 5, preco_unitario: 50 }],
    }),
  });
  const j = await ped.json();
  if (!ped.ok) throw new Error("pedido legacy " + JSON.stringify(j));
  return j.id;
}
async function criaLotes(posProdutoId) {
  // cria lotes após pedido para permitir migração FIFO
  const a = await fetch(`${base}/estoque/movimentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: posProdutoId,
      tipo: "ENTRADA",
      quantidade: 4,
      valor_unitario: 30,
      documento: "LOTE-FLAG-A",
      fifo_enabled: true,
    }),
  });
  if (!a.ok) throw new Error("lote a");
  const b = await fetch(`${base}/estoque/movimentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: posProdutoId,
      tipo: "ENTRADA",
      quantidade: 6,
      valor_unitario: 40,
      documento: "LOTE-FLAG-B",
      fifo_enabled: true,
    }),
  });
  if (!b.ok) throw new Error("lote b");
}

async function getPedido(id) {
  const r = await fetch(`${base}/pedidos/${id}`);
  const j = await r.json();
  if (!r.ok) throw new Error("get pedido " + JSON.stringify(j));
  return j;
}
async function listPedidos() {
  const r = await fetch(`${base}/pedidos?tipo=VENDA&limit=5`);
  const j = await r.json();
  if (!r.ok) throw new Error("list pedidos " + JSON.stringify(j));
  return j;
}

jest.setTimeout(30000);

describe("Flag fifo_aplicado em pedidos", () => {
  test("(1) Pedido legacy exibe fifo_aplicado=false e após migrar_fifo=true fica true", async () => {
    await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    const mig = await fetch(`${base}/migrations`, { method: "POST" });
    if (!mig.ok) throw new Error("migrations");

    const forn = await criaFornecedor();
    const cli = await criaEntity();
    const prod = await criaProduto("Produto Flag FIFO", forn);

    const pedidoId = await criaPedidoLegacy(prod, cli);

    // GET single
    const pedidoAntes = await getPedido(pedidoId);
    expect(pedidoAntes.fifo_aplicado).toBe(false);

    // Lista deve conter campo
    const listaAntes = await listPedidos();
    const registroListaAntes = listaAntes.find((p) => p.id === pedidoId);
    expect(registroListaAntes).toBeTruthy();
    expect(registroListaAntes.fifo_aplicado).toBe(false);

    // Criar lotes e migrar
    await criaLotes(prod);
    const put = await fetch(`${base}/pedidos/${pedidoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ migrar_fifo: true }),
    });
    const putJ = await put.json();
    expect(put.ok).toBe(true);
    expect(putJ.ok).toBe(true);

    const pedidoDepois = await getPedido(pedidoId);
    expect(pedidoDepois.fifo_aplicado).toBe(true);

    const listaDepois = await listPedidos();
    const registroListaDepois = listaDepois.find((p) => p.id === pedidoId);
    expect(registroListaDepois).toBeTruthy();
    expect(registroListaDepois.fifo_aplicado).toBe(true);
  });
});
