import { computeIndicadoresNumeric } from "@/lib/relatorios/computeIndicadoresNumeric";

describe("computeIndicadoresNumeric", () => {
  const dias365 = 365;

  test("PMR: média CR / vendas × dias (ex.: ~182,5 dias)", () => {
    const r = computeIndicadoresNumeric({
      vendas: 1000,
      compras: 800,
      cogs: 400,
      estoqueValor: 2000,
      contasReceberInicial: 500,
      contasReceberFinal: 500,
      contasPagarInicial: 0,
      contasPagarFinal: 0,
      diasPeriodo: dias365,
    });
    // crMedia = 500 → (500/1000)*365 = 182.5
    expect(r.pmr).toBe(182.5);
  });

  test("PMR null quando vendas = 0", () => {
    const r = computeIndicadoresNumeric({
      vendas: 0,
      compras: 100,
      cogs: 0,
      estoqueValor: 100,
      contasReceberInicial: 1000,
      contasReceberFinal: 1000,
      contasPagarInicial: 0,
      contasPagarFinal: 0,
      diasPeriodo: 30,
    });
    expect(r.pmr).toBeNull();
  });

  test("PMP: média CP / compras × dias", () => {
    const r = computeIndicadoresNumeric({
      vendas: 5000,
      compras: 2000,
      cogs: 1000,
      estoqueValor: 3000,
      contasReceberInicial: 0,
      contasReceberFinal: 0,
      contasPagarInicial: 400,
      contasPagarFinal: 400,
      diasPeriodo: dias365,
    });
    // cpMedia = 400 → (400/2000)*365 = 73.0
    expect(r.pmp).toBe(73);
  });

  test("PMP null quando compras = 0", () => {
    const r = computeIndicadoresNumeric({
      vendas: 100,
      compras: 0,
      cogs: 0,
      estoqueValor: 0,
      contasReceberInicial: 0,
      contasReceberFinal: 0,
      contasPagarInicial: 50000,
      contasPagarFinal: 50000,
      diasPeriodo: dias365,
    });
    expect(r.pmp).toBeNull();
  });

  test("cenário ‘estranho’: compras baixas no período e saldo CP alto → PMP explode (fórmula atual)", () => {
    const r = computeIndicadoresNumeric({
      vendas: 50000,
      compras: 500,
      cogs: 20000,
      estoqueValor: 15000,
      contasReceberInicial: 1000,
      contasReceberFinal: 1000,
      contasPagarInicial: 8000,
      contasPagarFinal: 8000,
      diasPeriodo: dias365,
    });
    // cpMedia = 8000 → (8000/500)*365 = 5840
    expect(r.pmp).toBe(5840);
  });

  test("giro de estoque = COGS / estoque (2 casas)", () => {
    const r = computeIndicadoresNumeric({
      vendas: 10000,
      compras: 8000,
      cogs: 6000,
      estoqueValor: 2000,
      contasReceberInicial: 0,
      contasReceberFinal: 0,
      contasPagarInicial: 0,
      contasPagarFinal: 0,
      diasPeriodo: 365,
    });
    expect(r.giroEstoque).toBe(3);
  });

  test("DVE usa diasPeriodo: (estoque/COGS)×dias", () => {
    const r = computeIndicadoresNumeric({
      vendas: 1,
      compras: 1,
      cogs: 3650,
      estoqueValor: 1000,
      contasReceberInicial: 0,
      contasReceberFinal: 0,
      contasPagarInicial: 0,
      contasPagarFinal: 0,
      diasPeriodo: 365,
    });
    expect(r.giroEstoque).toBe(3.65);
    // DVE = (estoque/cogs)×dias = (1000/3650)×365 = 100
    expect(r.dve).toBe(100);
  });

  test("DVE em período curto escala com diasPeriodo", () => {
    const r = computeIndicadoresNumeric({
      vendas: 1,
      compras: 1,
      cogs: 3650,
      estoqueValor: 1000,
      contasReceberInicial: 0,
      contasReceberFinal: 0,
      contasPagarInicial: 0,
      contasPagarFinal: 0,
      diasPeriodo: 30,
    });
    // (1000/3650)×30 = 8.219... -> toFixed(1) = 8.2
    expect(r.dve).toBe(8.2);
  });

  test("DVE fallback: (estoque/COGS)×dias quando giro seria 0", () => {
    const r = computeIndicadoresNumeric({
      vendas: 100,
      compras: 100,
      cogs: 0,
      estoqueValor: 500,
      contasReceberInicial: 0,
      contasReceberFinal: 0,
      contasPagarInicial: 0,
      contasPagarFinal: 0,
      diasPeriodo: 90,
    });
    expect(r.giroEstoque).toBeNull();
    expect(r.dve).toBeNull();
  });

  test("DVE fallback com COGS > 0 e giro null não aplica — precisa estoque e cogs para segundo ramo", () => {
    const r = computeIndicadoresNumeric({
      vendas: 100,
      compras: 100,
      cogs: 100,
      estoqueValor: 0,
      contasReceberInicial: 0,
      contasReceberFinal: 0,
      contasPagarInicial: 0,
      contasPagarFinal: 0,
      diasPeriodo: 30,
    });
    expect(r.giroEstoque).toBeNull();
    expect(r.dve).toBeNull();
  });

  test("período curto: diasPeriodo = 30 reduz PMR proporcionalmente", () => {
    const r = computeIndicadoresNumeric({
      vendas: 1000,
      compras: 1000,
      cogs: 100,
      estoqueValor: 5000,
      contasReceberInicial: 200,
      contasReceberFinal: 200,
      contasPagarInicial: 0,
      contasPagarFinal: 0,
      diasPeriodo: 30,
    });
    // crMedia = 200 → (200/1000)*30 = 6
    expect(r.pmr).toBe(6);
  });
});
