import React from "react";
import { useToast } from "components/entities/shared";

// Gera cronograma de promissórias e expõe handlers reutilizáveis.
// Mantém compatibilidade com props atuais de PedidoFormPromissorias.
export function usePromissoriasSchedule({
  numeroPromissorias,
  onNumeroPromissoriasChange,
  dataPrimeiraPromissoria,
  onDataPrimeiraPromissoriasChange,
  totalLiquido,
  frequenciaPromissorias,
  intervaloDiasPromissorias,
  promissoriaDatas,
  onPromissoriaDatasChange,
  promissoriasMeta,
}) {
  const warnedPaidRef = React.useRef(new Set());
  const { push } = useToast();

  // Calcular valor por promissória quando há total (replica efeito original)
  React.useEffect(() => {
    if (totalLiquido > 0 && numeroPromissorias > 0) {
      const valorCalculado = totalLiquido / numeroPromissorias;
      onNumeroPromissoriasChange(numeroPromissorias, valorCalculado);
    }
  }, [totalLiquido, numeroPromissorias, onNumeroPromissoriasChange]);

  const handlePaidFocus = React.useCallback(
    (idx) => {
      const seq = idx + 1;
      const isPaid =
        Array.isArray(promissoriasMeta?.paidSeqs) &&
        promissoriasMeta.paidSeqs.includes(seq);
      if (!isPaid) return;
      if (warnedPaidRef.current.has(seq)) return;
      push(
        `A ${seq}ª parcela já está PAGA. Alterar a data não terá efeito ao salvar (o cronograma pago é preservado).`,
        { type: "warn" },
      );
      warnedPaidRef.current.add(seq);
    },
    [promissoriasMeta?.paidSeqs, push],
  );

  const handleManualDateEdit = React.useCallback(
    (idx, e) => {
      const newValue = e?.target?.value ?? "";
      const next = [...promissoriaDatas];
      next[idx] = newValue;
      onPromissoriaDatasChange(next);
    },
    [promissoriaDatas, onPromissoriaDatasChange],
  );

  const handlePrimeiraDataChange = React.useCallback(
    (value) => {
      if (frequenciaPromissorias === "manual") {
        const seq = 1;
        const isPaid =
          Array.isArray(promissoriasMeta?.paidSeqs) &&
          promissoriasMeta.paidSeqs.includes(seq);
        if (isPaid && !warnedPaidRef.current.has(seq)) {
          push(
            `A ${seq}ª parcela já está PAGA. Alterar a data não terá efeito ao salvar (o cronograma pago é preservado).`,
            { type: "warn" },
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
      push,
    ],
  );

  // Memo de datas de vencimento (não manual)
  const datasVencimento = React.useMemo(() => {
    if (promissoriaDatas && promissoriaDatas.length) return promissoriaDatas;
    if (!dataPrimeiraPromissoria || numeroPromissorias < 1) return [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPrimeiraPromissoria)) return [];
    const base = new Date(dataPrimeiraPromissoria + "T00:00:00");
    if (isNaN(base.getTime())) return [];
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
          d = new Date(base);
          d.setMonth(d.getMonth() + i);
          break;
        case "mensal":
        default:
          d = new Date(base);
          d.setMonth(d.getMonth() + i);
      }
      try {
        const iso = d.toISOString().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) result.push(iso);
      } catch (_) {
        // ignora datas inválidas
      }
    }
    return result;
  }, [
    promissoriaDatas,
    dataPrimeiraPromissoria,
    numeroPromissorias,
    frequenciaPromissorias,
    intervaloDiasPromissorias,
  ]);

  return {
    datasVencimento,
    handleManualDateEdit,
    handlePrimeiraDataChange,
    handlePaidFocus,
    warnedPaidRef, // exposto apenas se futuro teste quiser inspecionar
  };
}

export default usePromissoriasSchedule;