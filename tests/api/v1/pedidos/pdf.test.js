/**
 * @jest-environment node
 */

const BASE_URL = 'http://localhost:3000';

async function apiRaw(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  const buffer = await res.arrayBuffer();
  return { status: res.status, headers: res.headers, buffer };
}

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

describe('API Pedidos - PDF NF', () => {
  test('deve gerar PDF após criar pedido', async () => {
    function randomDigits(n) { return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join(''); }
    const DOC_PF = randomDigits(11);
    const DOC_PJ = randomDigits(14);
    // Criar cliente PF ativo
    const { data: cliente } = await api('POST', '/api/v1/entities', {
      name: 'Cliente NF',
      entity_type: 'PF',
      document_digits: DOC_PF,
      ativo: true,
    });

    // Criar fornecedor e produto
    const { data: fornecedor } = await api('POST', '/api/v1/entities', {
      name: 'Fornecedor NF',
      entity_type: 'PJ',
      document_digits: DOC_PJ,
      ativo: true,
    });

    const { data: produto } = await api('POST', '/api/v1/produtos', {
      nome: 'Produto NF',
      preco_tabela: 45.00,
      suppliers: [fornecedor.id],
      ativo: true,
    });

    // Semear estoque com COMPRA para o produto antes da VENDA
    const compra = await api('POST', '/api/v1/pedidos', {
      tipo: 'COMPRA',
      partner_entity_id: fornecedor.id,
      itens: [
        { produto_id: produto.id, quantidade: 2, preco_unitario: 45.00, desconto_unitario: 0 }
      ]
    });
    expect(compra.status).toBe(201);

    const { data: pedido } = await api('POST', '/api/v1/pedidos', {
      tipo: 'VENDA',
      partner_entity_id: cliente.id,
      itens: [
        { produto_id: produto.id, quantidade: 2, preco_unitario: 40.00, desconto_unitario: 0 }
      ],
      tem_nota_fiscal: true
    });

    const { status, headers, buffer } = await apiRaw(`/api/v1/pedidos/${pedido.id}/nf`);

    expect(status).toBe(200);
    expect(headers.get('content-type')).toBe('application/pdf');
    // Espera um PDF com algum conteúdo (> 1KB)
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});