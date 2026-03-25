/**
 * Indicadores gerenciais (PMR, PMP, giro de estoque, DVE) — camada numérica pura.
 *
 * Semântica alinhada ao uso em `computeIndicadores` (PostgreSQL):
 * - PMR ≈ (média contas a receber / vendas do período) × dias do período
 * - PMP ≈ (média contas a pagar / compras do período) × dias do período
 *
 * Atenção: se **vendas** ou **compras** forem baixos no período mas saldos médios forem altos
 * (ex.: muita promessa em aberto de anos anteriores), PMR/PMP podem ficar muito altos — não é
 * bug de arredondamento, é sensibilidade da fórmula ao denominador.
 *
 * Giro: COGS / valor em estoque (instantâneo agregado). O rótulo na UI diz "×/ano", mas o valor
 * numérico é razão no período; DVE usa 365/giro quando giro > 0, senão (estoque/COGS)×dias.
 */

export interface IndicadoresResult {
  pmr: number | null;
  pmp: number | null;
  giroEstoque: number | null;
  dve: number | null;
}

export interface IndicadoresNumericInput {
  vendas: number;
  compras: number;
  cogs: number;
  /** Valor de estoque (custo × saldo) no modelo atual */
  estoqueValor: number;
  contasReceberInicial: number;
  contasReceberFinal: number;
  contasPagarInicial: number;
  contasPagarFinal: number;
  /** Dias entre início (inclusivo) e fim (exclusivo) do período do relatório */
  diasPeriodo: number;
}

export function computeIndicadoresNumeric(
  input: IndicadoresNumericInput
): IndicadoresResult {
  const {
    vendas,
    compras,
    cogs,
    estoqueValor: estoque,
    diasPeriodo,
    contasReceberInicial,
    contasReceberFinal,
    contasPagarInicial,
    contasPagarFinal,
  } = input;

  const crMedia = (contasReceberInicial + contasReceberFinal) / 2;
  const cpMedia = (contasPagarInicial + contasPagarFinal) / 2;

  const pmr =
    vendas > 0 && crMedia >= 0
      ? Number(((crMedia / vendas) * diasPeriodo).toFixed(1))
      : null;
  const pmp =
    compras > 0 && cpMedia >= 0
      ? Number(((cpMedia / compras) * diasPeriodo).toFixed(1))
      : null;
  const giroEstoque =
    estoque > 0 && cogs > 0 ? Number((cogs / estoque).toFixed(2)) : null;
  // DVE deve respeitar o recorte do período selecionado.
  // Usamos: DVE = (estoque / COGS) * diasPeriodo
  // (estoque/cogs vira "dias de cobertura" no modelo do dataset atual).
  const dve = estoque > 0 && cogs > 0 ? Number(((estoque / cogs) * diasPeriodo).toFixed(1)) : null;

  return { pmr, pmp, giroEstoque, dve };
}
