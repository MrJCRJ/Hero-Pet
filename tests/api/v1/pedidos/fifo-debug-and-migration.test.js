/* @jest-environment node */

function api(path, init = {}) {
  return fetch(`http://localhost:3000${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

async function createEntradaLegacy(produtoId, quantidade, valor_unitario = 8) {
  const r = await api("/api/v1/estoque/movimentos", {
    method: "POST",
    body: JSON.stringify({
      produto_id: produtoId,
      tipo: "ENTRADA",
      quantidade,
      valor_unitario,
    }),
  });
  if (!r.ok) throw new Error("falha criar entrada legacy");
  return r.json();
}
async function createCompraLote(produtoId, quantidade, preco = 10) {
  // cria COMPRA que gera lote (estoque_lote) para migrar depois
  const body = {
    tipo: "COMPRA",
    partner_entity_id: 1,
    itens: [{ produto_id: produtoId, quantidade, preco_unitario: preco }],
  };
  const r = await api("/api/v1/pedidos", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("falha criar compra");
  return r.json();
}

async function createVendaLegacy(produtoId, quantidade, preco = 20) {
  const body = {
    tipo: "VENDA",
    partner_entity_id: 1,
    itens: [{ produto_id: produtoId, quantidade, preco_unitario: preco }],
  };
  const r = await api("/api/v1/pedidos", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("falha criar venda");
  return r.json();
}

describe("FIFO debug + migration job", () => {
  let produtoId;
  beforeAll(async () => {
    // cria entidade parceira (cliente)
    const er = await api("/api/v1/entities", {
      method: "POST",
      body: JSON.stringify({
        name: "Cliente FIFO Debug",
        entity_type: "PJ",
        document_digits: "",
        document_status: "pending",
        document_pending: false,
      }),
    });
    await er.json();
    // cria fornecedor (obrigatório para produto)
    const ef = await api("/api/v1/entities", {
      method: "POST",
      body: JSON.stringify({
        name: "Fornecedor FIFO Debug",
        entity_type: "PJ",
        document_digits: "",
        document_status: "pending",
        document_pending: false,
      }),
    });
    const fornecedor = await ef.json();
    // cria produto simples vinculando fornecedor
    const pr = await api("/api/v1/produtos", {
      method: "POST",
      body: JSON.stringify({
        nome: "Produto FIFO Debug",
        preco_tabela: 50,
        fornecedor_id: fornecedor.id,
      }),
    });
    const pj = await pr.json();
    produtoId = pj.id;
  });

  test("pedido venda initial legacy -> eligible após compra de lotes -> migrado via job", async () => {
    // Cria saldo agregado sem lotes (entradas legacy) para permitir venda legacy
    await createEntradaLegacy(produtoId, 10, 5);
    const venda = await createVendaLegacy(produtoId, 5, 30);
    // debug deve mostrar legacy (sem lotes ainda). Como não há lotes, não fica eligible.
    let dbg = await api(`/api/v1/pedidos/${venda.id}/fifo_debug`);
    expect(dbg.status).toBe(200);
    let dbgJson = await dbg.json();
    expect(dbgJson.fifo_state).toBe("legacy");

    // criar lote suficiente
    await createCompraLote(produtoId, 10, 8);

    // Agora debug deve indicar eligible
    dbg = await api(`/api/v1/pedidos/${venda.id}/fifo_debug`);
    dbgJson = await dbg.json();
    expect(dbgJson.fifo_state).toBe("eligible");

    // rodar job de migração
    const job = await api("/api/v1/pedidos/fifo_migration_job", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    });
    expect(job.status).toBe(200);
    const jobJson = await job.json();
    expect(jobJson.processed).toBeGreaterThanOrEqual(1);

    // debug deve virar fifo
    dbg = await api(`/api/v1/pedidos/${venda.id}/fifo_debug`);
    dbgJson = await dbg.json();
    expect(dbgJson.fifo_state).toBe("fifo");
    expect(dbgJson.fifo_aplicado).toBe(true);
  });
});
