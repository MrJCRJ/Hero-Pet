import React from "react";
import { formatBRL } from "components/common/format";
import { formatYMDToBR } from "components/common/date";
import PayPromissoriaModal from "./modals/PayPromissoriaModal";

export default function PromissoriasDots({ pedidoId, count, onChanged }) {
  const [rows, setRows] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [actionLoading] = React.useState(false);
  const [payModal, setPayModal] = React.useState(null); // { seq, due_date, paid_date }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/pedidos/${pedidoId}/promissorias`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "Falha ao carregar parcelas");
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pedidoId]);

  const reloadPromissorias = async () => {
    try {
      const res = await fetch(`/api/v1/pedidos/${pedidoId}/promissorias`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erro ao recarregar promissórias:", e);
    }
  };

  const handleMarkPaid = (seq) => {
    // Abre modal com data padrão (hoje) e mostra vencimento
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const paid_date = `${y}-${m}-${d}`;
    const row = rows?.find((r) => r.seq === seq);
    setPayModal({
      seq,
      due_date: row?.due_date?.slice(0, 10) || null,
      paid_date,
    });
  };

  const colorFor = (status) => {
    if (status === "PAGO") return "bg-green-500";
    if (status === "ATRASADO") return "bg-red-500";
    return "bg-yellow-500";
  };

  const borderFor = () => ""; // sem destaque de PIX

  if (loading) return <span className="text-xs text-gray-400">...</span>;
  if (!rows || rows.length === 0) {
    const n = Math.max(0, Number(count) || 0);
    if (n >= 1) {
      return (
        <div className="relative inline-flex gap-1" title={`${n} parcela(s)`}>
          {Array.from({ length: n }).map((_, i) => (
            <button
              key={i}
              type="button"
              className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500 cursor-pointer hover:scale-110 transition-transform"
              title={`Abrir parcela #${i + 1}`}
              disabled={actionLoading}
              onClick={async (e) => {
                e.stopPropagation();
                // Abre modal direto mesmo sem dados detalhados ainda
                const today = new Date();
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, "0");
                const d = String(today.getDate()).padStart(2, "0");
                const paid_date = `${y}-${m}-${d}`;
                setPayModal({ seq: i + 1, due_date: null, paid_date });
              }}
            />
          ))}
        </div>
      );
    }
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="relative inline-flex gap-1">
      {rows.map((r) => (
        <div key={r.seq} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (r.status === "PAGO") return;
              handleMarkPaid(r.seq);
            }}
            title={(() => {
              const amountFmt = formatBRL(Number(r.amount));
              if (r.status === "PAGO") {
                const paidStr = r.paid_at
                  ? formatYMDToBR(String(r.paid_at))
                  : "-";
                return `PAGO - ${paidStr} - ${amountFmt}`;
              }
              const dueStr = r.due_date ? formatYMDToBR(r.due_date) : "-";
              if (r.status === "ATRASADO" && r.due_date) {
                // calcula dias de atraso considerando apenas a data (sem timezone)
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
                const days = Math.max(
                  0,
                  Math.floor((todayUTC - dueUTC) / 86400000),
                );
                const plural = days === 1 ? "dia" : "dias";
                return `ATRASADO - ${days} ${plural} em atraso - vence ${dueStr} - ${amountFmt}`;
              }
              return `${r.status} • vence ${dueStr} • ${amountFmt}`;
            })()}
            className={`inline-block w-2.5 h-2.5 rounded-full ${colorFor(r.status)} ${borderFor(r)} ${r.status === "PAGO" ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
            disabled={actionLoading || r.status === "PAGO"}
          />
        </div>
      ))}

      {/* Modal de marcar pago com data customizável */}
      {payModal && (
        <PayPromissoriaModal
          pedidoId={pedidoId}
          seq={payModal.seq}
          dueDate={payModal.due_date}
          defaultPaidDate={payModal.paid_date}
          onClose={() => setPayModal(null)}
          onSuccess={async () => {
            try {
              await reloadPromissorias();
              if (typeof onChanged === "function") onChanged();
            } catch (e) {
              // noop
            }
          }}
        />
      )}
    </div>
  );
}
