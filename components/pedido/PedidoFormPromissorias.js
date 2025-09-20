import React from "react";
import { FormField } from "../ui/Form";

export function PedidoFormPromissorias({
  parcelado,
  onParceladoChange,
  numeroPromissorias,
  onNumeroPromissoriasChange,
  dataPrimeiraPromissoria,
  onDataPrimeiraPromissoriasChange,
  valorPorPromissoria,
  totalLiquido
}) {
  // Calcular valor por promissória quando há total
  React.useEffect(() => {
    if (totalLiquido > 0 && numeroPromissorias > 0) {
      const valorCalculado = totalLiquido / numeroPromissorias;
      onNumeroPromissoriasChange(numeroPromissorias, valorCalculado);
    }
  }, [totalLiquido, numeroPromissorias, onNumeroPromissoriasChange]);

  // Gerar datas de vencimento baseado na primeira data
  const gerarDatasVencimento = () => {
    if (!dataPrimeiraPromissoria || numeroPromissorias <= 1) return [];

    const datas = [];
    const dataBase = new Date(dataPrimeiraPromissoria);

    for (let i = 0; i < numeroPromissorias; i++) {
      const data = new Date(dataBase);
      data.setMonth(data.getMonth() + i);
      datas.push(data.toLocaleDateString('pt-BR'));
    }

    return datas;
  };

  const datasVencimento = gerarDatasVencimento();

  return (
    <div className="mt-4 border border-[var(--color-border)] rounded-lg p-4">
      <h4 className="font-semibold mb-3">Sistema de Promissórias</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={parcelado}
            onChange={(e) => {
              onParceladoChange(e.target.checked);
              if (!e.target.checked) {
                onNumeroPromissoriasChange(1);
              } else if (numeroPromissorias === 1) {
                onNumeroPromissoriasChange(2);
              }
            }}
          />
          Parcelar em Promissórias
        </label>

        {parcelado && (
          <>
            <div>
              <FormField
                label="Número de Promissórias"
                name="numero_promissorias"
                type="number"
                min="2"
                max="12"
                value={numeroPromissorias}
                onChange={(e) => onNumeroPromissoriasChange(Number(e.target.value))}
              />
            </div>

            <div>
              <FormField
                label="Data da 1ª Promissória"
                name="data_primeira_promissoria"
                type="date"
                value={dataPrimeiraPromissoria}
                onChange={(e) => onDataPrimeiraPromissoriasChange(e.target.value)}
              />
            </div>

            {valorPorPromissoria > 0 && (
              <div className="text-sm">
                <span className="font-medium">Valor por Promissória: </span>
                <span className="text-green-600 font-semibold">
                  R$ {valorPorPromissoria.toFixed(2)}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mostrar preview das datas de vencimento */}
      {parcelado && datasVencimento.length > 0 && (
        <div className="mt-4 p-3 bg-[var(--color-bg-secondary)] rounded">
          <h5 className="text-sm font-medium mb-2">Cronograma de Vencimentos:</h5>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            {datasVencimento.map((data, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{idx + 1}ª:</span>
                <span className="font-mono">{data}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}