import React from 'react';
import { formatBRL } from 'components/common/format';
import { computeLucroBruto, computeComissoes, computeMargensPosComissao } from './utils';

/**
 * Bloco de resumo de lucro, com percentuais configuráveis e margens pós comissão.
 */
export function PedidoFormResumoLucro({ itens, totalItens, percentuaisRefParsed, percRefInput, setPercRefInput }) {
  const { totalLucro } = computeLucroBruto(itens);
  const algumCarregando = itens.some((it) => it?.custo_carregando);
  const percentuaisRef = percentuaisRefParsed.length ? percentuaisRefParsed : [3, 5];
  const comissoesRef = computeComissoes(totalItens, percentuaisRef);
  const lucroPos = comissoesRef.map((c) => totalLucro - c);
  const margensPos = computeMargensPosComissao(totalLucro, totalItens, comissoesRef);
  const lucroCls =
    totalLucro > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : totalLucro < 0
        ? 'text-red-600 dark:text-red-400'
        : 'opacity-70';

  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      <div className="flex items-center gap-3 flex-wrap justify-end">
        <span className="font-medium">Total:</span>
        <span className="font-semibold">{formatBRL(Number(totalItens || 0))}</span>
        <span className="font-medium">Lucro:</span>
        <span className={`font-semibold ${lucroCls}`}>
          {algumCarregando && totalLucro === 0 ? '…' : formatBRL(totalLucro)}
        </span>
        <label className="flex items-center gap-1 text-[10px] opacity-70">
          <span>Ref %:</span>
          <input
            type="text"
            value={percRefInput}
            onChange={(e) => setPercRefInput(e.target.value)}
            className="px-1 py-0.5 border rounded w-24 bg-[var(--color-bg-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
            title="Digite percentuais separados por vírgula. Ex: 3,5 ou 2,4,6"
          />
        </label>
        {percentuaisRef.map((p, idx) => {
          const comVal = comissoesRef[idx];
          const lp = lucroPos[idx];
          const marg = margensPos[idx];
          const lucroPosCls =
            lp > 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : lp < 0
                ? 'text-red-600 dark:text-red-400'
                : 'opacity-70';
          return (
            <React.Fragment key={p}>
              <span className="font-medium" title={`Comissão de ${p}% sobre o total da venda`}>
                Comissão {p}%:
              </span>
              <span
                className={`font-semibold ${comVal > 0 ? 'text-amber-600 dark:text-amber-400' : 'opacity-70'}`}
                title={`Valor da comissão de ${p}%`}
              >
                {formatBRL(comVal)}
              </span>
              <span
                className="font-medium"
                title={`Lucro após deduzir ${p}% do total da venda`}
              >
                Lucro - {p}%:
              </span>
              <span
                className={`font-semibold ${lucroPosCls}`}
                title={`Lucro final após deduzir ${p}%`}
              >
                {formatBRL(lp)}
              </span>
              {marg != null && (
                <span className="text-[10px] opacity-70" title={`Margem % após comissão ${p}%`}>
                  ({marg}% marg.)
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="opacity-60 text-[10px] leading-snug max-w-[560px] text-right">
        Comissão X% calculada sobre o TOTAL da venda. Edite a lista de percentuais em &quot;Ref %&quot; (máx 4). Lucro - X% = Lucro total - Comissão X%.
      </div>
      <div className={`text-[11px] mt-1 font-medium ${lucroCls}`}>
        {`Lucro Total: ${formatBRL(totalLucro)}`}
      </div>
    </div>
  );
}

export default PedidoFormResumoLucro;
