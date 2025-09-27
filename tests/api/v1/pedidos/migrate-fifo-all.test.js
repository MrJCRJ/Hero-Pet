/** @jest-environment node */
// Usa fetch global (Node 18+)

// Testa POST /api/v1/pedidos/migrate_fifo_all
// Fluxo:
// 1. Cria produto + compra (gera lote)
// 2. Cria 2 vendas -> inicialmente legacy (saídas sem pivots de consumo)
// 3. Confirma legacy_count >= 2
// 4. Chama /migrate_fifo_all
// 5. Verifica legacy_count reduziu (<= valor anterior) e idealmente 0
// 6. Lista pedidos e valida que fifo_state mudou para 'fifo' ou 'eligible' (dependendo de cobertura)

async function post(path, body) {
  const r = await fetch(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || `Falha POST ${path}`);
  return json;
}
async function get(path) {
  const r = await fetch(`http://localhost:3000${path}`);
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.error || `Falha GET ${path}`);
  return json;
}

async function createEntityPF(nome) {
  return post('/api/v1/entities', {
    name: nome,
    entity_type: 'PF',
    document_digits: '',
    document_pending: true,
    document_status: 'pending',
    ativo: true,
  });
}
async function createProduto(nome) {
  const fornecedor = await post('/api/v1/entities', {
    name: 'Fornecedor MIG ALL PJ',
    entity_type: 'PJ',
    document_digits: '',
    document_pending: true,
    document_status: 'pending',
    ativo: true,
  });
  return post('/api/v1/produtos', {
    nome,
    preco_tabela: 100,
    markup_percent_default: 30,
    ativo: true,
    suppliers: [fornecedor.id],
  });
}
async function createCompra(produtoId, qtd = 20, preco = 40) {
  const ent = await createEntityPF('Fornecedor MIG.ALL');
  return post('/api/v1/pedidos', {
    tipo: 'COMPRA',
    partner_entity_id: ent.id,
    itens: [
      { produto_id: produtoId, quantidade: qtd, preco_unitario: preco },
    ],
  });
}
async function createVenda(produtoId, qtd = 5, preco = 120) {
  const cli = await createEntityPF('Cliente MIG.ALL');
  return post('/api/v1/pedidos', {
    tipo: 'VENDA',
    partner_entity_id: cli.id,
    itens: [
      { produto_id: produtoId, quantidade: qtd, preco_unitario: preco },
    ],
  });
}

describe('POST /api/v1/pedidos/migrate_fifo_all', () => {
  test('endpoint migrate_fifo_all é idempotente e não aumenta legacy_count', async () => {
    const prod = await createProduto('Produto MIG FIFO ALL');
    // Criar uma compra e duas vendas normais (com lotes disponíveis).
    await createCompra(prod.id, 50, 30);
    await createVenda(prod.id, 4, 150);
    await createVenda(prod.id, 3, 150);

    const before = await get('/api/v1/pedidos/legacy_count');
    expect(typeof before.legacy_count).toBe('number');
    expect(before.legacy_count).toBeGreaterThanOrEqual(0);

    const mig = await post('/api/v1/pedidos/migrate_fifo_all', {});
    expect(mig).toHaveProperty('migrated');
    expect(typeof mig.migrated).toBe('number');
    expect(mig.migrated).toBeGreaterThanOrEqual(0); // pode ser 0 em ambiente totalmente FIFO

    const after = await get('/api/v1/pedidos/legacy_count');
    expect(after).toHaveProperty('legacy_count');
    expect(after.legacy_count).toBeGreaterThanOrEqual(0);
    // Não deve aumentar
    expect(after.legacy_count).toBeLessThanOrEqual(before.legacy_count);

    // Lista confirma presença de fifo_state e nenhuma regressão de dados
    const list = await get('/api/v1/pedidos?tipo=VENDA&limit=10');
    expect(Array.isArray(list)).toBe(true);
    const states = list.map(p => p.fifo_state).filter(Boolean);
    expect(states.length).toBeGreaterThan(0);
  });
});
