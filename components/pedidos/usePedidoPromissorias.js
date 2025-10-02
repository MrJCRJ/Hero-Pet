import React from 'react';

export function usePedidoPromissorias(editingOrder) {
  const [numeroPromissorias, setNumeroPromissorias] = React.useState(() => {
    const n = Number(editingOrder?.numero_promissorias || 0);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const [dataPrimeiraPromissoria, setDataPrimeiraPromissoria] = React.useState(() =>
    editingOrder?.data_primeira_promissoria
      ? String(editingOrder.data_primeira_promissoria).slice(0, 10)
      : ''
  );
  const [valorPorPromissoria, setValorPorPromissoria] = React.useState(() =>
    Number(editingOrder?.valor_por_promissoria || 0)
  );
  const [frequenciaPromissorias, setFrequenciaPromissorias] = React.useState('mensal');
  const [intervaloDiasPromissorias, setIntervaloDiasPromissorias] = React.useState(30);
  const [promissoriaDatas, setPromissoriaDatas] = React.useState(() =>
    Array.isArray(editingOrder?.promissorias) && editingOrder.promissorias.length
      ? editingOrder.promissorias.map(p => p.due_date).filter(Boolean)
      : []
  );
  const [promissoriasMeta, setPromissoriasMeta] = React.useState(() => {
    if (Array.isArray(editingOrder?.promissorias) && editingOrder.promissorias.length) {
      const paidSeqs = editingOrder.promissorias.filter(p => p.paid_at).map(p => p.seq);
      const today = new Date();
      const overdueSeqs = editingOrder.promissorias
        .filter(p => !p.paid_at && p.due_date && new Date(p.due_date + 'T00:00:00') < new Date(today.getFullYear(), today.getMonth(), today.getDate()))
        .map(p => p.seq);
      return { anyPaid: paidSeqs.length > 0, paidSeqs, overdueSeqs };
    }
    return { anyPaid: false, paidSeqs: [], overdueSeqs: [] };
  });

  const skipNextAutoGenRef = React.useRef(false);
  const editingHydratedRef = React.useRef(
    Boolean(editingOrder?.promissorias && editingOrder.promissorias.length),
  );

  // Regerar cronograma quando aplicável
  React.useEffect(() => {
    if (skipNextAutoGenRef.current) { skipNextAutoGenRef.current = false; return; }
    if (editingHydratedRef.current && promissoriaDatas.length) return;
    if (frequenciaPromissorias === 'manual') return;
    if (!dataPrimeiraPromissoria || !/^\d{4}-\d{2}-\d{2}$/.test(dataPrimeiraPromissoria) || numeroPromissorias < 2) {
      if (promissoriaDatas.length) setPromissoriaDatas([]);
      return;
    }
    const base = new Date(dataPrimeiraPromissoria);
    if (isNaN(base.getTime())) return;
    const datas = [];
    for (let i = 0; i < numeroPromissorias; i++) {
      const d = new Date(base);
      if (frequenciaPromissorias === 'mensal') d.setMonth(d.getMonth() + i);
      else if (frequenciaPromissorias === 'quinzenal') d.setDate(d.getDate() + i * 15);
      else if (frequenciaPromissorias === 'semanal') d.setDate(d.getDate() + i * 7);
      else if (frequenciaPromissorias === 'dias') {
        const n = Number(intervaloDiasPromissorias) || 30;
        d.setDate(d.getDate() + i * n);
      }
      try {
        const iso = d.toISOString().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) datas.push(iso);
      } catch (_) { /* ignore */ }
    }
    const isSame = promissoriaDatas.length === datas.length && promissoriaDatas.every((v, i) => v === datas[i]);
    if (!isSame) setPromissoriaDatas(datas);
  }, [frequenciaPromissorias, dataPrimeiraPromissoria, numeroPromissorias, intervaloDiasPromissorias, promissoriaDatas]);

  function hydrateFromEditing(order) {
    if (!order) return;
    if (Array.isArray(order.promissorias) && order.promissorias.length) {
      const datas = order.promissorias.map(p => p.due_date).filter(Boolean);
      setPromissoriaDatas(datas);
      skipNextAutoGenRef.current = true;
      editingHydratedRef.current = true;
      const paidSeqs = order.promissorias.filter(p => p.paid_at).map(p => p.seq);
      const today = new Date();
      const overdueSeqs = order.promissorias
        .filter(p => !p.paid_at && p.due_date && new Date(p.due_date + 'T00:00:00') < new Date(today.getFullYear(), today.getMonth(), today.getDate()))
        .map(p => p.seq);
      setPromissoriasMeta({ anyPaid: paidSeqs.length > 0, paidSeqs, overdueSeqs });
    } else {
      setPromissoriasMeta({ anyPaid: false, paidSeqs: [], overdueSeqs: [] });
    }
  }

  // Soma total das promissórias baseada no valor unitário (fallback simples)
  const sumPromissorias = React.useMemo(() => {
    const n = Number(numeroPromissorias) || 0;
    const v = Number(valorPorPromissoria) || 0;
    if (n <= 0 || v <= 0) return 0;
    return Number((n * v).toFixed(2));
  }, [numeroPromissorias, valorPorPromissoria]);

  // Expor função para comparar com totalLiquido (tolerância 0.01)
  function computePromissoriasMismatch(totalLiquido) {
    const t = Number(totalLiquido) || 0;
    const diff = Number((sumPromissorias - t).toFixed(2));
    const mismatch = Math.abs(diff) > 0.01;
    return { mismatch, diff, sumPromissorias };
  }

  return {
    numeroPromissorias,
    setNumeroPromissorias,
    dataPrimeiraPromissoria,
    setDataPrimeiraPromissoria,
    valorPorPromissoria,
    setValorPorPromissoria,
    frequenciaPromissorias,
    setFrequenciaPromissorias,
    intervaloDiasPromissorias,
    setIntervaloDiasPromissorias,
    promissoriaDatas,
    setPromissoriaDatas,
    promissoriasMeta,
    hydrateFromEditing,
    sumPromissorias,
    computePromissoriasMismatch,
  };
}