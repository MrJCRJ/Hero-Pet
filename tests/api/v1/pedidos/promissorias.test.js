/**
 * @jest-environment node
 */

const BASE_URL = "http://localhost:3000";

async function api(method, path, body, expectOk = true) {
  const headers = { "Content-Type": "application/json" };
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

describe("API Pedidos - Promissórias", () => {
  let cliente, fornecedor, produto;
  function randomDigits(n) {
    let s = "";
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
    return s;
  }
  // Gera um documento PF (11 dígitos) e PJ (14 dígitos) aleatórios por execução para evitar 409
  const DOC_PF = randomDigits(11);
  const DOC_PJ = randomDigits(14);

  beforeAll(async () => {
    // Criar cliente PF ativo
    const { data: clienteData } = await api("POST", "/api/v1/entities", {
      name: "Cliente Promissoria",
      entity_type: "PF",
      document_digits: DOC_PF,
      ativo: true,
    });
    cliente = clienteData;

    // Criar fornecedor e produto
    const { data: fornecedorData } = await api("POST", "/api/v1/entities", {
      name: "Fornecedor XPTO",
      entity_type: "PJ",
      document_digits: DOC_PJ,
      ativo: true,
    });
    fornecedor = fornecedorData;

    const { data: produtoData } = await api("POST", "/api/v1/produtos", {
      nome: "Produto Promissoria",
      preco_tabela: 100.0,
      suppliers: [fornecedor.id],
      ativo: true,
    });
    produto = produtoData;

    // Semear estoque com uma COMPRA (estoque alto para todos os testes)
    await api("POST", "/api/v1/pedidos", {
      tipo: "COMPRA",
      partner_entity_id: fornecedor.id,
      itens: [
        {
          produto_id: produto.id,
          quantidade: 50,
          preco_unitario: 100.0,
          desconto_unitario: 0,
        },
      ],
    });
  });

  test("POST deve calcular valor_por_promissoria quando numero_promissorias > 1", async () => {
    // Criar pedido VENDA com 3 promissórias
    const payload = {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      itens: [
        {
          produto_id: produto.id,
          quantidade: 1,
          preco_unitario: 90.0,
          desconto_unitario: 0,
        },
      ],
      numero_promissorias: 3,
      data_primeira_promissoria: "2025-01-15",
    };

    const { status, data: pedido } = await api(
      "POST",
      "/api/v1/pedidos",
      payload,
    );
    expect(status).toBe(201);
    expect(pedido.numero_promissorias).toBe(3);
    expect(pedido.valor_por_promissoria).toBe("30.00");
  });

  test("PUT deve recalcular valor_por_promissoria ao alterar numero_promissorias", async () => {
    const { data: pedidoCriado } = await api("POST", "/api/v1/pedidos", {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      itens: [
        {
          produto_id: produto.id,
          quantidade: 2,
          preco_unitario: 50.0,
          desconto_unitario: 0,
        },
      ],
      numero_promissorias: 2,
      data_primeira_promissoria: "2025-02-01",
    });

    const put = await api("PUT", `/api/v1/pedidos/${pedidoCriado.id}`, {
      numero_promissorias: 5,
    });

    expect(put.status).toBe(200);
    // Buscar o pedido atualizado via GET para validar os campos
    const after = await api("GET", `/api/v1/pedidos/${pedidoCriado.id}`);
    expect(after.status).toBe(200);
    expect(after.data.numero_promissorias).toBe(5);
    expect(after.data.valor_por_promissoria).toBe("20.00");
  });

  test("deve criar cronograma de promissórias ao criar pedido parcelado", async () => {
    const { data: pedido } = await api("POST", "/api/v1/pedidos", {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      numero_promissorias: 3,
      data_primeira_promissoria: "2025-10-01",
      itens: [{ produto_id: produto.id, quantidade: 1, preco_unitario: 150 }],
    });

    expect(pedido.numero_promissorias).toBe(3);
    expect(pedido.valor_por_promissoria).toBe("50.00");

    const { data: promissorias } = await api(
      "GET",
      `/api/v1/pedidos/${pedido.id}/promissorias`,
    );

    expect(promissorias).toHaveLength(3);
    expect(promissorias[0].seq).toBe(1);
    expect(promissorias[0].due_date).toBe("2025-10-01");
    expect(promissorias[0].amount).toBe("50.00");
    expect(promissorias[0].status).toBe("PENDENTE");
    expect(promissorias[0].paid_at).toBeNull();

    expect(promissorias[1].due_date).toBe("2025-11-01");
    expect(promissorias[2].due_date).toBe("2025-12-01");
  });

  test("deve respeitar cronograma manual (promissoria_datas) no POST", async () => {
    const datas = ["2025-12-05", "2026-01-10", "2026-02-15"];
    const { data: pedido } = await api("POST", "/api/v1/pedidos", {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      numero_promissorias: 3,
      data_primeira_promissoria: "2025-12-05",
      promissoria_datas: datas,
      itens: [{ produto_id: produto.id, quantidade: 1, preco_unitario: 300 }],
    });

    const { data: promissorias } = await api(
      "GET",
      `/api/v1/pedidos/${pedido.id}/promissorias`,
    );
    expect(promissorias.map((p) => p.due_date)).toEqual(datas);
  });

  test("PUT deve aceitar promissoria_datas e regenerar cronograma quando nenhuma parcela foi paga", async () => {
    const { data: pedido } = await api("POST", "/api/v1/pedidos", {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      numero_promissorias: 2,
      data_primeira_promissoria: "2025-09-25",
      itens: [{ produto_id: produto.id, quantidade: 1, preco_unitario: 200 }],
    });

    const novasDatas = ["2025-10-20", "2025-11-20"];
    await api("PUT", `/api/v1/pedidos/${pedido.id}`, {
      promissoria_datas: novasDatas,
      numero_promissorias: 2,
    });
    const { data: promissorias } = await api(
      "GET",
      `/api/v1/pedidos/${pedido.id}/promissorias`,
    );
    expect(promissorias.map((p) => p.due_date)).toEqual(novasDatas);
  });

  // teste de geração de PIX removido: funcionalidade descontinuada

  test("deve marcar promissória como paga", async () => {
    // Escolhe uma data de primeira promissória dois meses atrás para garantir que a 2a parcela já esteja vencida
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() - 2, 15);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    const d = String(base.getDate()).padStart(2, "0");
    const firstDue = `${y}-${m}-${d}`;
    const { data: pedido } = await api("POST", "/api/v1/pedidos", {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      numero_promissorias: 2,
      data_primeira_promissoria: firstDue, // vencida para testar ATRASADO
      itens: [{ produto_id: produto.id, quantidade: 1, preco_unitario: 200 }],
    });

    // Marcar primeira como paga
    const { data: payResult } = await api(
      "POST",
      `/api/v1/pedidos/${pedido.id}/promissorias/1?action=pay`,
    );
    expect(payResult.ok).toBe(true);

    const { data: promissorias } = await api(
      "GET",
      `/api/v1/pedidos/${pedido.id}/promissorias`,
    );
    expect(promissorias[0].status).toBe("PAGO");
    expect(promissorias[0].paid_at).toBeTruthy();
    expect(promissorias[1].status).toBe("ATRASADO"); // segunda parcela vencida
  });

  test("deve incluir total_pago na listagem de pedidos", async () => {
    const { data: pedido } = await api("POST", "/api/v1/pedidos", {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      numero_promissorias: 3,
      data_primeira_promissoria: "2025-10-10",
      itens: [{ produto_id: produto.id, quantidade: 1, preco_unitario: 300 }],
    });

    // Marcar primeira parcela como paga
    await api("POST", `/api/v1/pedidos/${pedido.id}/promissorias/1?action=pay`);

    const { data: pedidos } = await api("GET", "/api/v1/pedidos");
    const pedidoNaLista = pedidos.find((p) => p.id === pedido.id);

    expect(pedidoNaLista.total_liquido).toBe("300.00");
    expect(pedidoNaLista.total_pago).toBe("100.00"); // 300/3 = 100 por parcela
  });

  test("deve retornar erro ao tentar pagar promissória já paga", async () => {
    const { data: pedido } = await api("POST", "/api/v1/pedidos", {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      numero_promissorias: 2,
      itens: [{ produto_id: produto.id, quantidade: 1, preco_unitario: 100 }],
    });

    // Pagar primeira vez
    await api("POST", `/api/v1/pedidos/${pedido.id}/promissorias/1?action=pay`);

    // Tentar pagar novamente
    const { data: result } = await api(
      "POST",
      `/api/v1/pedidos/${pedido.id}/promissorias/1?action=pay`,
    );
    expect(result.ok).toBe(true);
    expect(result.alreadyPaid).toBe(true);
  });

  // teste de action=pix removido: funcionalidade descontinuada

  test("GET /pedidos/:id deve incluir promissorias com status e campos principais", async () => {
    const { data: pedido } = await api("POST", "/api/v1/pedidos", {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      numero_promissorias: 2,
      data_primeira_promissoria: "2025-12-01",
      itens: [{ produto_id: produto.id, quantidade: 1, preco_unitario: 100 }],
    });

    const { data: full } = await api("GET", `/api/v1/pedidos/${pedido.id}`);
    expect(Array.isArray(full.promissorias)).toBe(true);
    expect(full.promissorias.length).toBe(2);
    expect(full.promissorias[0]).toHaveProperty("seq");
    expect(full.promissorias[0]).toHaveProperty("due_date");
    expect(full.promissorias[0]).toHaveProperty("amount");
    expect(["PENDENTE", "ATRASADO", "PAGO"]).toContain(
      full.promissorias[0].status,
    );
  });

  test("PUT com promissoria_datas após pagar 1ª parcela não altera parcela paga", async () => {
    const { data: pedido } = await api("POST", "/api/v1/pedidos", {
      tipo: "VENDA",
      partner_entity_id: cliente.id,
      numero_promissorias: 2,
      data_primeira_promissoria: "2025-11-10",
      itens: [{ produto_id: produto.id, quantidade: 1, preco_unitario: 200 }],
    });

    // Pagar a primeira parcela
    await api("POST", `/api/v1/pedidos/${pedido.id}/promissorias/1?action=pay`);
    const before = await api(
      "GET",
      `/api/v1/pedidos/${pedido.id}/promissorias`,
    );
    const paidDate = before.data[0].due_date;

    // Tentar atualizar cronograma manual
    const novas = ["2025-12-20", "2026-01-20"];
    await api("PUT", `/api/v1/pedidos/${pedido.id}`, {
      promissoria_datas: novas,
      numero_promissorias: 2,
    });

    const after = await api("GET", `/api/v1/pedidos/${pedido.id}/promissorias`);
    expect(after.data.length).toBe(2);
    // Primeira continua paga e mantém data original
    expect(after.data[0].status).toBe("PAGO");
    expect(after.data[0].due_date).toBe(paidDate);
  });
});
