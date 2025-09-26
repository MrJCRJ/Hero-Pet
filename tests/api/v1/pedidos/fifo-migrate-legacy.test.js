// tests/api/v1/pedidos/fifo-migrate-legacy.test.js
// @jest-environment node
// Testa migração de pedido legacy (sem lotes) para FIFO usando PUT com migrar_fifo=true sem reenviar itens.
import database from "infra/database";

const base = "http://localhost:3000/api/v1";

async function criaEntityPJ(nome = "FORN MIG") {
  const r = await fetch(`${base}/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, entity_type: "PJ" }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("fornecedor " + JSON.stringify(j));
  return j.id;
}
async function criaEntityPF(nome = "CLIENTE MIG") {
  const r = await fetch(`${base}/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, entity_type: "PF" }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("cliente " + JSON.stringify(j));
  return j.id;
}
async function criaProduto(nome, fornecedorId) {
  const r = await fetch(`${base}/produtos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome,
      fornecedor_id: fornecedorId,
      preco_tabela: 100,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("produto " + JSON.stringify(j));
  return j.id;
}
async function criaPedidoLegacy(produtoId, clienteId) {
  // Sem lotes ainda: criamos pedido VENDA que cairá em fallback média (que será zero se sem entradas?)
  // Para ter média >0 criamos uma entrada agregada sem lotes (legacy path) antes do pedido.
  // Entrada agregada (sem FIFO) — usa movimento_estoque tipo ENTRADA
  const ent = await fetch(`${base}/estoque/movimentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: produtoId,
      tipo: "ENTRADA",
      quantidade: 10,
      valor_unitario: 20,
      documento: "LEGACY-ENT-1",
    }),
  });
  if (![200, 201].includes(ent.status))
    throw new Error("entrada legacy falhou");
  const ped = await fetch(`${base}/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo: "VENDA",
      partner_entity_id: clienteId,
      itens: [{ produto_id: produtoId, quantidade: 5, preco_unitario: 50 }],
    }),
  });
  const pj = await ped.json();
  if (!ped.ok) throw new Error("pedido legacy " + JSON.stringify(pj));
  return pj.id;
}

async function criaLotesDepois(produtoId) {
  // Agora inserimos ENTRADAS (que vão criar lotes FIFO) após o pedido ter sido criado
  const ent1 = await fetch(`${base}/estoque/movimentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: produtoId,
      tipo: "ENTRADA",
      quantidade: 4,
      valor_unitario: 30,
      documento: "LOTE-A",
      fifo_enabled: true,
    }),
  });
  if (![200, 201].includes(ent1.status))
    throw new Error("entrada lote A falhou");
  const ent2 = await fetch(`${base}/estoque/movimentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      produto_id: produtoId,
      tipo: "ENTRADA",
      quantidade: 6,
      valor_unitario: 40,
      documento: "LOTE-B",
      fifo_enabled: true,
    }),
  });
  if (![200, 201].includes(ent2.status))
    throw new Error("entrada lote B falhou");
}

async function getPedido(id) {
  const r = await fetch(`${base}/pedidos/${id}`);
  const j = await r.json();
  if (!r.ok) throw new Error("get pedido " + JSON.stringify(j));
  return j;
}

jest.setTimeout(30000);

describe("PUT /api/v1/pedidos/:id migrar_fifo", () => {
  test("(1) Migra pedido legacy para FIFO mantendo itens e recalculando custos", async () => {
    // Ambiente limpo
    await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    const mig = await fetch(`${base}/migrations`, { method: "POST" });
    if (![200, 201].includes(mig.status)) throw new Error("migracoes");

    const forn = await criaEntityPJ();
    const cliente = await criaEntityPF();
    const prod = await criaProduto("Produto MIG FIFO", forn);

    const pedidoId = await criaPedidoLegacy(prod, cliente);
    let pedidoAntes = await getPedido(pedidoId);
    expect(pedidoAntes.itens.length).toBe(1);
    const itemAntes = pedidoAntes.itens[0];
    // custo legacy baseado em média de entradas (20) → custo_unit_venda esperado ~20
    expect(Number(itemAntes.custo_unit_venda)).toBeCloseTo(20, 2);

    // Criar lotes FIFO depois
    await criaLotesDepois(prod);

    // Executar PUT migrar_fifo sem reenviar itens
    const put = await fetch(`${base}/pedidos/${pedidoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ migrar_fifo: true }),
    });
    const putJ = await put.json();
    expect(put.status).toBe(200);
    expect(putJ.ok).toBe(true);

    const pedidoDepois = await getPedido(pedidoId);
    expect(pedidoDepois.itens.length).toBe(1);
    const itemDepois = pedidoDepois.itens[0];
    // Agora custo deve refletir consumo FIFO real (lotes 30 e 40 não foram consumidos porque a venda já existia —
    // porém ao migrar, recomputamos e como agora existem lotes suficientes, deve recalcular custo com FIFO.
    // A venda foi de 5. Lotes disponíveis: 4@30 + 6@40 → consumo = 4*30 + 1*40 = 160 custo_total => custo_unit ~32
    expect(Number(itemDepois.custo_total_item)).toBeCloseTo(160, 2);
    expect(Number(itemDepois.custo_unit_venda)).toBeCloseTo(32, 2);
  });
});
