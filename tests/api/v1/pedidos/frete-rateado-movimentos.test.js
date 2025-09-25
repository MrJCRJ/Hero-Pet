// tests/api/v1/pedidos/frete-rateado-movimentos.test.js

/** @jest-environment node */

const base = `http://localhost:3000`;

async function criaParceiroPJ(nome = "Fornecedor Frete Movimentos") {
  const randDoc = String(
    Math.floor(10_000_000_000_000 + Math.random() * 89_999_999_999_999),
  );
  const r = await fetch(`${base}/api/v1/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: nome,
      entity_type: "PJ",
      document_digits: randDoc,
      document_pending: false,
    }),
  });
  const b = await r.json();
  if (!r.ok) throw new Error(b.error || "erro criar fornecedor");
  return b;
}

async function criaProduto(nome = "Produto Rateio Frete", preco = 10) {
  const forn = await criaParceiroPJ("FORN RATEIO FRETE");
  const resp = await fetch(`${base}/api/v1/produtos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, preco_tabela: preco, suppliers: [forn.id] }),
  });
  const b = await resp.json();
  if (!resp.ok) throw new Error(b.error || "erro criar produto");
  return b; // API retorna o próprio produto
}

async function getMovs(produtoId) {
  const resp = await fetch(
    `${base}/api/v1/estoque/movimentos?produto_id=${produtoId}`,
  );
  const b = await resp.json();
  if (!resp.ok) throw new Error(b.error || "erro get movimentos");
  return b;
}

async function criaCompraComFrete({ itens, frete_total }) {
  const fornecedor = await criaParceiroPJ();
  const body = {
    tipo: "COMPRA",
    partner_entity_id: fornecedor.id,
    itens: itens.map((it) => ({
      produto_id: it.produto_id,
      quantidade: it.quantidade,
      preco_unitario: it.preco_unitario,
    })),
    frete_total,
    numero_promissorias: 1,
  };
  const r = await fetch(`${base}/api/v1/pedidos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "erro criar pedido");
  return data;
}

describe("Rateio de frete refletido nos movimentos", () => {
  test("Cada movimento de ENTRADA recebe frete proporcional", async () => {
    const p1 = await criaProduto("P RF 1", 10);
    const p2 = await criaProduto("P RF 2", 20);
    const pedido = await criaCompraComFrete({
      itens: [
        { produto_id: p1.id, quantidade: 2, preco_unitario: 10 }, // base=20
        { produto_id: p2.id, quantidade: 1, preco_unitario: 20 }, // base=20
      ],
      frete_total: 5, // por quantidade: 2/3 => 3.33, 1/3 => 1.67
    });

    const m1 = await getMovs(p1.id);
    const m2 = await getMovs(p2.id);
    const e1 = m1.find(
      (x) =>
        x.tipo === "ENTRADA" &&
        String(x.documento || "").includes(`PEDIDO:${pedido.id}`),
    );
    const e2 = m2.find(
      (x) =>
        x.tipo === "ENTRADA" &&
        String(x.documento || "").includes(`PEDIDO:${pedido.id}`),
    );
    expect(e1).toBeTruthy();
    expect(e2).toBeTruthy();
    expect(Number(e1.frete)).toBeCloseTo(3.33, 2);
    expect(Number(e2.frete)).toBeCloseTo(1.67, 2);
    expect(Number(e1.valor_total)).toBeCloseTo(23.33, 2);
    expect(Number(e2.valor_total)).toBeCloseTo(21.67, 2);
  });
});
