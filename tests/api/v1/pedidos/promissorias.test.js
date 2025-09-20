/**
 * @jest-environment node
 */

const BASE_URL = 'http://localhost:3000';

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

describe('API Pedidos - Promissórias', () => {
  test('POST deve calcular valor_por_promissoria quando numero_promissorias > 1', async () => {
    // Criar cliente PF ativo
    const { data: cliente } = await api('POST', '/api/v1/entities', {
      name: 'Cliente Promissoria',
      entity_type: 'PF',
      document_digits: '12345678901',
      ativo: true,
    });

    // Criar produto
    const { data: fornecedor } = await api('POST', '/api/v1/entities', {
      name: 'Fornecedor XPTO',
      entity_type: 'PJ',
      document_digits: '12345678000199',
      ativo: true,
    });

    const { data: produto } = await api('POST', '/api/v1/produtos', {
      nome: 'Produto Promissoria',
      preco_tabela: 100.00,
      suppliers: [fornecedor.id],
      ativo: true,
    });

    // Semear estoque com uma COMPRA antes (evita saldo negativo na VENDA)
    const compra = await api('POST', '/api/v1/pedidos', {
      tipo: 'COMPRA',
      partner_entity_id: fornecedor.id,
      itens: [
        { produto_id: produto.id, quantidade: 1, preco_unitario: 100.00, desconto_unitario: 0 }
      ]
    });
    expect(compra.status).toBe(201);

    // Criar pedido VENDA com 3 promissórias
    const payload = {
      tipo: 'VENDA',
      partner_entity_id: cliente.id,
      itens: [
        { produto_id: produto.id, quantidade: 1, preco_unitario: 90.00, desconto_unitario: 0 }
      ],
      numero_promissorias: 3,
      data_primeira_promissoria: '2025-01-15'
    };

    const { status, data: pedido } = await api('POST', '/api/v1/pedidos', payload);
    expect(status).toBe(201);
    expect(pedido.numero_promissorias).toBe(3);
    expect(pedido.valor_por_promissoria).toBe('30.00');
  });

  test('PUT deve recalcular valor_por_promissoria ao alterar numero_promissorias', async () => {
    // Criar cliente PF ativo
    const { data: cliente } = await api('POST', '/api/v1/entities', {
      name: 'Cliente Promissoria 2',
      entity_type: 'PF',
      document_digits: '12345678902',
      ativo: true,
    });

    // Criar fornecedor e produto
    const { data: fornecedor } = await api('POST', '/api/v1/entities', {
      name: 'Fornecedor Z',
      entity_type: 'PJ',
      document_digits: '22345678000199',
      ativo: true,
    });

    const { data: produto } = await api('POST', '/api/v1/produtos', {
      nome: 'Produto Z',
      preco_tabela: 60.00,
      suppliers: [fornecedor.id],
      ativo: true,
    });

    // Semear estoque via COMPRA (3 unidades)
    const compra = await api('POST', '/api/v1/pedidos', {
      tipo: 'COMPRA',
      partner_entity_id: fornecedor.id,
      itens: [
        { produto_id: produto.id, quantidade: 3, preco_unitario: 60.00, desconto_unitario: 0 }
      ]
    });
    expect(compra.status).toBe(201);

    const { data: pedidoCriado } = await api('POST', '/api/v1/pedidos', {
      tipo: 'VENDA',
      partner_entity_id: cliente.id,
      itens: [
        { produto_id: produto.id, quantidade: 2, preco_unitario: 50.00, desconto_unitario: 0 }
      ],
      numero_promissorias: 2,
      data_primeira_promissoria: '2025-02-01'
    });

    const put = await api('PUT', `/api/v1/pedidos/${pedidoCriado.id}`, {
      numero_promissorias: 5
    });

    expect(put.status).toBe(200);
    // Buscar o pedido atualizado via GET para validar os campos
    const after = await api('GET', `/api/v1/pedidos/${pedidoCriado.id}`);
    expect(after.status).toBe(200);
    expect(after.data.numero_promissorias).toBe(5);
    expect(after.data.valor_por_promissoria).toBe('20.00');
  });
});