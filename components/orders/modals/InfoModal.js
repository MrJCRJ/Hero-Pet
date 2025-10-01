import React from "react";
import { Modal } from "../../common/Modal";
import { CARD_TITLES } from "../shared/constants";
import {
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
        return <ComprasHistoryChart comprasHistory={data.comprasHistory} />;

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
            status="pendentes"
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
            status="atrasadas"
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
            status="proximo"
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
            status="carry"
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
