import React from "react";
import { FormField } from "../ui/Form";

export function PedidoFormPromissorias({
  numeroPromissorias,
  onNumeroPromissoriasChange,
  dataPrimeiraPromissoria,
  onDataPrimeiraPromissoriasChange,
  valorPorPromissoria,
  totalLiquido,
  frequenciaPromissorias,
  onFrequenciaPromissoriasChange,
  intervaloDiasPromissorias,
  onIntervaloDiasPromissoriasChange,
  promissoriaDatas,
  onPromissoriaDatasChange,
  promissoriasMeta,
}) {
  // Controla quais parcelas pagas já receberam aviso para evitar repetir alert
  const warnedPaidRef = React.useRef(new Set());

  // Confirmação no foco para parcelas pagas; libera edição local se confirmado
  const handlePaidFocus = React.useCallback(
    (idx) => {
      const seq = idx + 1;
      const isPaid =
        Array.isArray(promissoriasMeta?.paidSeqs) &&
        promissoriasMeta.paidSeqs.includes(seq);
      if (!isPaid) return;
      if (warnedPaidRef.current.has(seq)) return;
      window.alert(
        `A ${seq}ª parcela já está PAGA. Alterar a data não terá efeito ao salvar (o cronograma pago é preservado).`,
      );
      warnedPaidRef.current.add(seq);
    },
    [promissoriasMeta?.paidSeqs],
  );

  // Edição manual
  const handleManualDateEdit = React.useCallback(
    (idx, e) => {
      const newValue = e?.target?.value ?? "";
      const next = [...promissoriaDatas];
      next[idx] = newValue;
      onPromissoriaDatasChange(next);
    },
    [promissoriaDatas, onPromissoriaDatasChange],
  );

  // Edição da 1ª data
  const handlePrimeiraDataChange = React.useCallback(
    (value) => {
      if (frequenciaPromissorias === "manual") {
        const seq = 1;
        const isPaid =
          Array.isArray(promissoriasMeta?.paidSeqs) &&
          promissoriasMeta.paidSeqs.includes(seq);
        if (isPaid && !warnedPaidRef.current.has(seq)) {
          window.alert(
            `A ${seq}ª parcela já está PAGA. Alterar a data não terá efeito ao salvar (o cronograma pago é preservado).`,
          );
          warnedPaidRef.current.add(seq);
        }
        const next = [...promissoriaDatas];
        next[0] = value || "";
        onPromissoriaDatasChange(next);
      }
      onDataPrimeiraPromissoriasChange(value);
    },
    [
      frequenciaPromissorias,
      promissoriasMeta?.paidSeqs,
      promissoriaDatas,
      onPromissoriaDatasChange,
      onDataPrimeiraPromissoriasChange,
    ],
  );

  // Calcular valor por promissória quando há total
  React.useEffect(() => {
    if (totalLiquido > 0 && numeroPromissorias > 0) {
      const valorCalculado = totalLiquido / numeroPromissorias;
      onNumeroPromissoriasChange(numeroPromissorias, valorCalculado);
    }
  }, [totalLiquido, numeroPromissorias, onNumeroPromissoriasChange]);

  // Gerar datas de vencimento baseado na primeira data e frequência
  const datasVencimento = React.useMemo(() => {
    if (promissoriaDatas && promissoriaDatas.length) return promissoriaDatas;
    if (!dataPrimeiraPromissoria || numeroPromissorias < 1) return [];
    const base = new Date(dataPrimeiraPromissoria + "T00:00:00");
    const result = [];
    const count = Math.max(1, numeroPromissorias);

    const addDays = (date, days) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };

    for (let i = 0; i < count; i++) {
      let d;
      switch (frequenciaPromissorias) {
        case "semanal":
          d = addDays(base, 7 * i);
          break;
        case "quinzenal":
          d = addDays(base, 15 * i);
          break;
        case "dias": {
          const step = Math.max(1, Number(intervaloDiasPromissorias) || 1);
          d = addDays(base, step * i);
          break;
        }
        case "manual":
          // manual não usa geração automática aqui; já teria retornado acima se existisse
          d = new Date(base);
          d.setMonth(d.getMonth() + i);
          break;
        case "mensal":
        default:
          d = new Date(base);
          d.setMonth(d.getMonth() + i);
      }
      result.push(d.toISOString().slice(0, 10));
    }
    return result;
  }, [
    promissoriaDatas,
    dataPrimeiraPromissoria,
    numeroPromissorias,
    frequenciaPromissorias,
    intervaloDiasPromissorias,
  ]);

  return (
    <div className="mt-4 border border-[var(--color-border)] rounded-lg p-4">
      <h4 className="font-semibold mb-3">Sistema de Promissórias</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sistema sempre ativo: sem checkbox */}
        <div>
          <label className="block text-xs mb-1 text-[var(--color-text-secondary)]">Frequência</label>
          <select
            className=" border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg-primary)] w-full"
            value={frequenciaPromissorias}
            onChange={(e) => onFrequenciaPromissoriasChange(e.target.value)}
          >
            <option value="mensal">Mensal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="semanal">Semanal</option>
            <option value="dias">A cada N dias</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {frequenciaPromissorias === "dias" && (
          <div>
            <FormField
              label="Intervalo (dias)"
              name="intervalo_dias_promissorias"
              type="number"
              min="1"
              value={intervaloDiasPromissorias}
              onChange={(e) => onIntervaloDiasPromissoriasChange(Number(e.target.value))}
            />
          </div>
        )}

        <div>
          <FormField
            label="Número de Promissórias"
            name="numero_promissorias"
            type="number"
            min="1"
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
            onChange={(e) => handlePrimeiraDataChange(e.target.value)}
          />
        </div>

        {valorPorPromissoria > 0 && (
          <div className="text-sm">
            <span className="font-medium">Valor por Promissória: </span>
            <span className="text-green-600 font-semibold">R$ {valorPorPromissoria.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Cronograma detalhado */}
      <div className="mt-4 border border-[var(--color-border)] rounded overflow-hidden">
        <div className="px-3 py-2 bg-[var(--color-bg-secondary)] flex items-center justify-between gap-2">
          <h5 className="text-sm font-medium">Cronograma de Vencimentos</h5>
          <div className="flex items-center gap-2">
            {frequenciaPromissorias !== "manual" && (
              <button
                type="button"
                className="text-xs px-2 py-1 border rounded hover:bg-[var(--color-bg-primary)]"
                onClick={() => {
                  const base = promissoriaDatas && promissoriaDatas.length ? promissoriaDatas : datasVencimento;
                  onPromissoriaDatasChange(base.slice(0, Math.max(1, numeroPromissorias)));
                  onFrequenciaPromissoriasChange("manual");
                }}
              >
                Usar cronograma manual atual
              </button>
            )}
            {frequenciaPromissorias === "manual" && (
              <button
                type="button"
                className="text-xs px-2 py-1 border rounded hover:bg-[var(--color-bg-primary)]"
                onClick={() =>
                  onPromissoriaDatasChange(
                    new Array(Math.max(1, numeroPromissorias))
                      .fill("")
                      .map((_, i) => (i === 0 ? dataPrimeiraPromissoria : "")),
                  )
                }
              >
                Resetar Manual
              </button>
            )}
          </div>
        </div>
        <div className="p-3">
          {promissoriasMeta?.anyPaid && (
            <div className="mb-3 text-amber-600 text-xs">
              Existem parcelas já pagas (#
              {Array.isArray(promissoriasMeta.paidSeqs) ? promissoriasMeta.paidSeqs.join(", ") : ""}
              ). Alterar datas dessas parcelas não será aplicado ao salvar.
            </div>
          )}

          {frequenciaPromissorias === "manual" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: Math.max(1, numeroPromissorias) }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-right">{idx + 1}ª</span>
                  {Array.isArray(promissoriasMeta?.paidSeqs) &&
                    promissoriasMeta.paidSeqs.includes(idx + 1) && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">PAGO</span>
                    )}
                  {Array.isArray(promissoriasMeta?.overdueSeqs) &&
                    promissoriasMeta.overdueSeqs.includes(idx + 1) && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">ATRASADO</span>
                    )}
                  <input
                    type="date"
                    className="border border-[var(--color-border)] rounded px-2 py-1 bg-[var(--color-bg-primary)]"
                    value={promissoriaDatas[idx] || ""}
                    onFocus={() => handlePaidFocus(idx)}
                    onChange={(e) => handleManualDateEdit(idx, e)}
                    onInput={(e) => handleManualDateEdit(idx, e)}
                  />
                </div>
              ))}
            </div>
          ) : datasVencimento.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {datasVencimento.map((data, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 border border-[var(--color-border)] rounded px-2 py-1 bg-[var(--color-bg-primary)]"
                >
                  <div className="flex items-center gap-2">
                    <span>{idx + 1}ª</span>
                    {Array.isArray(promissoriasMeta?.paidSeqs) &&
                      promissoriasMeta.paidSeqs.includes(idx + 1) && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">PAGO</span>
                      )}
                    {Array.isArray(promissoriasMeta?.overdueSeqs) &&
                      promissoriasMeta.overdueSeqs.includes(idx + 1) && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">ATRASADO</span>
                      )}
                  </div>
                  <span className="font-mono">
                    {new Date(data + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs opacity-70">Defina a 1ª data e o número de promissórias para ver o cronograma.</div>
          )}
        </div>
      </div>
    </div>
  );
}
