import React, { useCallback, useEffect, useMemo, useState } from "react";
import { formatBRL } from "components/common/format";
import { formatYMDToBR } from "components/common/date";
import PayPromissoriaModal from "./modals/PayPromissoriaModal";

/**
 * PromissoriasDots
 * Exibe as parcelas (promissórias) de um pedido como pontos coloridos:
 *  - Amarelo: PENDENTE
 *  - Vermelho: ATRASADO
 *  - Verde: PAGO
 * Foca em visual compacto e ação rápida para marcar como pago.
 */
export default function PromissoriasDots({
  pedidoId,
  count,
  onChanged,
  size = "sm", // sm (default) | md
}) {
  const [rows, setRows] = useState(null); // null = ainda carregando ou não buscou
  const [loading, setLoading] = useState(true); // inicia true para evitar render final com rows null
  const [error, setError] = useState(null);
  const [payModal, setPayModal] = useState(null); // { seq, due_date, paid_date }

  const DOT_SIZE_CLASS = size === "md" ? "w-3 h-3" : "w-2.5 h-2.5";
  const FETCH_URL = useMemo(
    () => `/api/v1/pedidos/${pedidoId}/promissorias`,
    [pedidoId],
  );

  const todayISO = () => {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  };

  const openPayModal = useCallback(
    (seq) => {
      const row = rows?.find((r) => r.seq === seq);
      setPayModal({
        seq,
        due_date: row?.due_date?.slice(0, 10) || null,
        paid_date: todayISO(),
      });
    },
    [rows],
  );

  const colorFor = useCallback((status) => {
    switch (status) {
      case "PAGO":
        return "bg-green-500";
      case "ATRASADO":
        return "bg-red-500";
      default:
        return "bg-yellow-500"; // PENDENTE / outros
    }
  }, []);

  // Tooltip/descrição detalhada
  const buildTooltip = useCallback((r) => {
    const amountFmt = formatBRL(Number(r.amount));
    if (r.status === "PAGO") {
      const paidStr = r.paid_at ? formatYMDToBR(String(r.paid_at)) : "-";
      return `PAGO • ${paidStr} • ${amountFmt}`;
    }
    const dueStr = r.due_date ? formatYMDToBR(r.due_date) : "-";
    if (r.status === "ATRASADO" && r.due_date) {
      const [yy, mm, dd] = String(r.due_date)
        .slice(0, 10)
        .split("-")
        .map(Number);
      const dueUTC = Date.UTC(yy || 1970, (mm || 1) - 1, dd || 1);
      const now = new Date();
      const todayUTC = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const days = Math.max(0, Math.floor((todayUTC - dueUTC) / 86400000));
      const plural = days === 1 ? "dia" : "dias";
      return `ATRASADO • ${days} ${plural} em atraso • vence ${dueStr} • ${amountFmt}`;
    }
    return `${r.status} • vence ${dueStr} • ${amountFmt}`;
  }, []);

  const fetchPromissorias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const res = await fetch(FETCH_URL, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao carregar parcelas");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message || "Erro ao carregar parcelas");
        setRows([]); // evita estado nulo para branchs posteriores
      }
    } finally {
      setLoading(false);
    }
  }, [FETCH_URL]);

  // Carrega inicial quando muda pedido
  useEffect(() => {
    fetchPromissorias();
  }, [fetchPromissorias]);

  const reloadPromissorias = useCallback(async () => {
    try {
      const res = await fetch(FETCH_URL, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      // Mantém estado atual se falhar; log opcional
      console.warn("Erro ao recarregar promissórias:", e);
    }
  }, [FETCH_URL]);

  // Estados intermediários
  if (loading && rows == null) {
    // Skeleton mínimo (usa count como hint ou 3)
    const n = Math.min(Math.max(Number(count) || 3, 1), 12);
    return (
      <div className="inline-flex gap-1" aria-label="Carregando parcelas">
        {Array.from({ length: n }).map((_, i) => (
          <span
            key={i}
            className={`inline-block ${DOT_SIZE_CLASS} rounded-full bg-gray-400/40 animate-pulse`}
          />
        ))}
      </div>
    );
  }

  if (error && (!rows || rows.length === 0)) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          fetchPromissorias();
        }}
        className="text-[10px] px-1 py-0.5 rounded border border-red-300 text-red-600 hover:bg-red-50"
        title={error}
      >
        Erro
      </button>
    );
  }

  // Caso sem dados ainda mas sabemos a contagem (fallback inicial do backend)
  if (rows && rows.length === 0) {
    const n = Math.max(0, Number(count) || 0);
    if (n >= 1) {
      return (
        <div
          className="relative inline-flex gap-1"
          title={`${n} parcela(s)`}
          aria-label={`${n} parcela(s) (dados detalhados ainda não carregados)`}
        >
          {Array.from({ length: n }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`inline-block ${DOT_SIZE_CLASS} rounded-full bg-yellow-500 cursor-pointer hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-500/70 transition-transform`}
              title={`Parcela #${i + 1}`}
              aria-label={`Abrir parcela ${i + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                openPayModal(i + 1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  openPayModal(i + 1);
                }
              }}
            />
          ))}
        </div>
      );
    }
    return <span className="text-gray-400">-</span>;
  }

  // Se por algum motivo chegarmos aqui com rows ainda null (race raro), mostra skeleton
  if (rows == null) {
    const n = Math.min(Math.max(Number(count) || 3, 1), 12);
    return (
      <div className="inline-flex gap-1" aria-label="Carregando parcelas">
        {Array.from({ length: n }).map((_, i) => (
          <span
            key={i}
            className={`inline-block ${DOT_SIZE_CLASS} rounded-full bg-gray-400/40 animate-pulse`}
          />
        ))}
      </div>
    );
  }

  // Render final com dados completos
  return (
    <div
      className="relative inline-flex gap-1"
      aria-label="Promissórias do pedido"
    >
      {rows.map((r) => {
        const isPaid = r.status === "PAGO";
        return (
          <div key={r.seq} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isPaid) return;
                openPayModal(r.seq);
              }}
              title={buildTooltip(r)}
              aria-label={buildTooltip(r)}
              className={`inline-block ${DOT_SIZE_CLASS} rounded-full ${colorFor(r.status)} ${isPaid ? "cursor-default" : "cursor-pointer hover:scale-110 focus:scale-110"} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-transform`}
              disabled={isPaid}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isPaid) {
                  e.preventDefault();
                  e.stopPropagation();
                  openPayModal(r.seq);
                }
              }}
            />
          </div>
        );
      })}

      {payModal && (
        <PayPromissoriaModal
          pedidoId={pedidoId}
          seq={payModal.seq}
          dueDate={payModal.due_date}
          /* defaultPaidDate mantém compat com comportamento anterior */
          defaultPaidDate={payModal.paid_date}
          onClose={() => setPayModal(null)}
          onSuccess={async () => {
            await reloadPromissorias();
            if (typeof onChanged === "function") onChanged();
          }}
        />
      )}
    </div>
  );
}
