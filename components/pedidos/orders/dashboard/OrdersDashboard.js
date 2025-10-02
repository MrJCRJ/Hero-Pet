import React, {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from "react";
import InfoModal from "../modals/InfoModal";
import HelpModal from "../modals/HelpModal";
import DashboardCards from "./DashboardCards";
import { useMonthState, useDashboardData } from "../shared/hooks";
import { monthToLabel } from "../shared/utils";

export default function OrdersDashboard({ month: monthProp, onMonthPersist }) {
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null); // string key

  const { month, setMonth } = useMonthState(monthProp);

  // Persistência local do mês selecionado
  useEffect(() => {
    // Hidrata somente no primeiro render se existir valor salvo
    try {
      const saved = window.localStorage.getItem("orders.dashboard.month");
      if (saved && /\d{4}-\d{2}/.test(saved)) {
        setMonth(saved);
      }
    } catch (_) {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!month) return;
    try {
      window.localStorage.setItem("orders.dashboard.month", month);
      onMonthPersist?.(month);
    } catch (_) {
      /* ignore */
    }
  }, [month, onMonthPersist]);
  const { data, loading, error } = useDashboardData(month);

  const label = useMemo(() => monthToLabel(month), [month]);

  const monthInputRef = useRef(null);
  const openMonthPicker = useCallback(() => {
    const el = monthInputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
      } else {
        el.focus();
      }
    } catch (_) {
      el.focus();
    }
  }, []);
  const onMonthKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMonthPicker();
      }
    },
    [openMonthPicker],
  );

  if (loading && !data) {
    return <div className="mb-3 text-sm opacity-70">Carregando resumo...</div>;
  }
  if (error) {
    return (
      <div className="mb-3 text-sm text-red-500">Erro: {String(error)}</div>
    );
  }
  if (!data) return null;

  const m = data;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="text-xs opacity-70">Resumo de {label}</div>
        <div className="flex items-center gap-2">
          <input
            ref={monthInputRef}
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            onClick={openMonthPicker}
            onKeyDown={onMonthKeyDown}
            aria-label="Selecionar mês do resumo"
            className="text-sm px-2 py-1 border rounded bg-[var(--color-bg-primary)] border-[var(--color-border)] calendar-icon-white fallback-icon cursor-pointer"
          />
          <button
            className="text-xs underline opacity-80 hover:opacity-100"
            onClick={() => setShowHelp(true)}
          >
            Entenda os cálculos
          </button>
        </div>
      </div>
      <DashboardCards data={m} onCardClick={setSelectedCard} />
      {selectedCard && (
        <InfoModal
          monthLabel={label}
          monthStr={month}
          data={m}
          cardKey={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
