import React from "react";
import Modal from "../../common/Modal";
import { CARD_TITLES } from "../shared/constants";
import {
  boundsFromYYYYMM,
  formatBRL,
  dispatchOrdersFilter,
} from "../shared/utils";
import ComprasHistoryChart from "../charts/ComprasHistoryChart";
import LucroBrutoDetails from "../charts/LucroBrutoDetails";
import VendasComprasOverlayDetails from "../charts/VendasComprasOverlayDetails";
import PromissoriasList from "../shared/PromissoriasList";

/**
 * Modal que exibe informações detalhadas sobre métricas específicas
 */
export default function InfoModal({
  cardKey,
  data,
  monthLabel,
  monthStr,
  onClose,
}) {
  const title = CARD_TITLES[cardKey] || "Detalhes";

  const onSelect = (detail) => {
    dispatchOrdersFilter(detail);
    onClose?.();
  };

  const renderContent = () => {
    switch (cardKey) {
      case "comprasMes":
        return (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">
                Total de Compras — {monthLabel}: {formatBRL(data.comprasMes)}
              </div>
              {typeof data.crescimentoComprasMoMPerc === "number" && (
                <div className="text-xs opacity-70 mt-0.5">
                  Vs mês anterior: {data.crescimentoComprasMoMPerc}% (Anterior:{" "}
                  {formatBRL(data.comprasMesAnterior)})
                </div>
              )}
              <ComprasHistoryChart comprasHistory={data.comprasHistory} />
            </div>
            <div className="pt-2 border-t border-[var(--color-border)]">
              <button
                onClick={() =>
                  onSelect({
                    tipo: "COMPRA",
                    from: boundsFromYYYYMM(monthStr).from,
                    to: boundsFromYYYYMM(monthStr).to,
                  })
                }
                className="px-3 py-1.5 text-xs rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)]"
              >
                Ver compras do mês na lista
              </button>
            </div>
          </div>
        );

      case "lucro_bruto":
        return <LucroBrutoDetails data={data} />;

      case "crescimento_mom":
        return <VendasComprasOverlayDetails data={data} />;

      case "promissorias_pendentes":
        return (
          <PromissoriasList
            title="Promissórias pendentes"
            monthLabel={monthLabel}
            monthStr={monthStr}
            status="pending"
            expectedCount={data.promissorias?.mesAtual?.pendentes?.count ?? 0}
            expectedAmount={data.promissorias?.mesAtual?.pendentes?.valor ?? 0}
            onSelect={onSelect}
          />
        );

      case "promissorias_atrasadas":
        return (
          <PromissoriasList
            title="Promissórias atrasadas"
            monthLabel={monthLabel}
            monthStr={monthStr}
            status="late"
            expectedCount={data.promissorias?.mesAtual?.atrasados?.count ?? 0}
            expectedAmount={data.promissorias?.mesAtual?.atrasados?.valor ?? 0}
            onSelect={onSelect}
          />
        );

      case "proximo_mes":
        return (
          <PromissoriasList
            title="Promissórias que irão para o próximo mês"
            monthLabel={monthLabel}
            monthStr={monthStr}
            status="next"
            expectedCount={data.promissorias?.proximoMes?.pendentes?.count ?? 0}
            expectedAmount={
              data.promissorias?.proximoMes?.pendentes?.valor ?? 0
            }
            onSelect={onSelect}
          />
        );

      case "carry_over":
        return (
          <PromissoriasList
            title="Promissórias que vieram de meses anteriores"
            monthLabel={monthLabel}
            monthStr={monthStr}
            status="carry_over"
            expectedCount={
              data.promissorias?.deMesesAnteriores?.emAberto?.count ?? 0
            }
            expectedAmount={
              data.promissorias?.deMesesAnteriores?.emAberto?.valor ?? 0
            }
            onSelect={onSelect}
          />
        );

      default:
        return <div className="text-sm">Sem detalhes.</div>;
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      {renderContent()}
    </Modal>
  );
}
