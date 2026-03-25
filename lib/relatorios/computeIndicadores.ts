import {
  computeIndicadoresNumeric,
  type IndicadoresResult,
} from "@/lib/relatorios/computeIndicadoresNumeric";
import {
  getCogsPeriodo,
  getComprasPeriodo,
  getContasPagarEmAberto,
  getContasReceberEmAberto,
  getEstoqueAtualCusto,
  getVendasPeriodo,
} from "@/lib/db/queries/relatoriosIndicadores";

export type { IndicadoresResult };

/** Inclui média de CR e vendas do período (para indicadores derivados BI). */
export interface IndicadoresComDetalhe extends IndicadoresResult {
  mediaContasReceber: number;
  vendasPeriodo: number;
  comprasPeriodo: number;
}

export interface IndicadoresPreload {
  vendas?: number;
  compras?: number;
  cogs?: number;
  estoque?: number;
  contasReceberInicial?: number;
  contasReceberFinal?: number;
  contasPagarInicial?: number;
  contasPagarFinal?: number;
}

export async function computeIndicadores(
  firstDay: string,
  lastDay: string,
  preload: IndicadoresPreload = {}
): Promise<IndicadoresComDetalhe> {
  const firstDate = new Date(firstDay);
  const lastDate = new Date(lastDay);
  const diasPeriodo = Math.max(
    1,
    Math.round((lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000))
  );

  const [vendas, compras, cogs, estoque, contasReceberInicial, contasReceberFinal, contasPagarInicial, contasPagarFinal] =
    await Promise.all([
      preload.vendas != null ? Promise.resolve(preload.vendas) : getVendasPeriodo(firstDay, lastDay),
      preload.compras != null ? Promise.resolve(preload.compras) : getComprasPeriodo(firstDay, lastDay),
      preload.cogs != null ? Promise.resolve(preload.cogs) : getCogsPeriodo(firstDay, lastDay),
      preload.estoque != null ? Promise.resolve(preload.estoque) : getEstoqueAtualCusto(),
      preload.contasReceberInicial != null
        ? Promise.resolve(preload.contasReceberInicial)
        : getContasReceberEmAberto(firstDay),
      preload.contasReceberFinal != null
        ? Promise.resolve(preload.contasReceberFinal)
        : getContasReceberEmAberto(lastDay),
      preload.contasPagarInicial != null
        ? Promise.resolve(preload.contasPagarInicial)
        : getContasPagarEmAberto(firstDay),
      preload.contasPagarFinal != null
        ? Promise.resolve(preload.contasPagarFinal)
        : getContasPagarEmAberto(lastDay),
    ]);

  const mediaContasReceber = (contasReceberInicial + contasReceberFinal) / 2;

  const base = computeIndicadoresNumeric({
    vendas,
    compras,
    cogs,
    estoqueValor: estoque,
    contasReceberInicial,
    contasReceberFinal,
    contasPagarInicial,
    contasPagarFinal,
    diasPeriodo,
  });

  return {
    ...base,
    mediaContasReceber,
    vendasPeriodo: vendas,
    comprasPeriodo: compras,
  };
}
