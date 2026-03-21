/**
 * Cálculo do Cenário de Liquidação.
 * Responde: "Se vendermos todo o estoque, recebermos todas as promissórias,
 * deduzirmos a comissão e devolvermos o capital aos sócios, quanto sobra (ou falta) em caixa?"
 */

export interface CenarioLiquidacaoInput {
  saldoCaixaAtual: number;
  valorPresumidoVendaEstoque: number;
  promissoriasAReceber: number;
  comissaoPct: number;
  saldoDevolverSocios: number;
}

export interface CenarioLiquidacaoResult {
  saldoCaixaAtual: number;
  valorPresumidoVendaBruto: number;
  comissaoPct: number;
  comissaoValor: number;
  vendaLiquidaEstoque: number;
  promissoriasAReceber: number;
  disponivelTotal: number;
  saldoDevolverSocios: number;
  resultadoFinal: number;
  erro?: string;
}

/**
 * Lê configuração de Cenário de Liquidação via variáveis de ambiente.
 * Defaults: comissao 6%, saldo a devolver 0.
 */
export function getConfigLiquidacao(): { comissaoPct: number; saldoDevolverSocios: number } {
  const comissaoPct = Number(process.env.COMISSAO_LIQUIDACAO_PCT);
  const saldoDevolverSocios = Number(process.env.SALDO_DEVOLVER_SOCIOS);

  return {
    comissaoPct: Number.isFinite(comissaoPct) && comissaoPct >= 0 ? comissaoPct : 6,
    saldoDevolverSocios: Number.isFinite(saldoDevolverSocios) && saldoDevolverSocios >= 0 ? saldoDevolverSocios : 0,
  };
}

/**
 * Calcula o Cenário de Liquidação.
 * Fórmulas:
 * - comissaoValor = valorPresumidoVenda × (comissaoPct / 100)
 * - vendaLiquidaEstoque = valorPresumidoVenda - comissaoValor
 * - disponivelTotal = saldoCaixa + vendaLiquidaEstoque + promissoriasAReceber
 * - resultadoFinal = disponivelTotal - saldoDevolverSocios
 */
export function computeCenarioLiquidacao(input: CenarioLiquidacaoInput): CenarioLiquidacaoResult {
  const {
    saldoCaixaAtual,
    valorPresumidoVendaEstoque,
    promissoriasAReceber,
    comissaoPct,
    saldoDevolverSocios,
  } = input;

  const comissaoValor = Number((valorPresumidoVendaEstoque * (comissaoPct / 100)).toFixed(2));
  const vendaLiquidaEstoque = Number((valorPresumidoVendaEstoque - comissaoValor).toFixed(2));
  const disponivelTotal = Number((saldoCaixaAtual + vendaLiquidaEstoque + promissoriasAReceber).toFixed(2));
  const resultadoFinal = Number((disponivelTotal - saldoDevolverSocios).toFixed(2));

  return {
    saldoCaixaAtual,
    valorPresumidoVendaBruto: valorPresumidoVendaEstoque,
    comissaoPct,
    comissaoValor,
    vendaLiquidaEstoque,
    promissoriasAReceber,
    disponivelTotal,
    saldoDevolverSocios,
    resultadoFinal,
  };
}
