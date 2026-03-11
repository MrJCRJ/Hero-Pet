import React from "react";
import Card from "../shared/Card";
import { DASHBOARD_CARDS } from "../shared/constants";
import { formatBRL } from "../shared/utils";

/**
 * Componente que renderiza todos os cards do dashboard
 */
export default function DashboardCards({ data, onCardClick }) {
  if (!data) return null;

  const formatValue = (value, config) => {
    if (config.formatValue && typeof value === "number") {
      return formatBRL(value);
    }
    return value;
  };

  const formatSubtitle = (subtitle, config, data) => {
    if (!subtitle) return null;

    if (config.formatSubtitle && typeof subtitle === "number") {
      return formatBRL(subtitle);
    }

    if (config.formatSubtitle && typeof subtitle === "string") {
      // Para casos especiais que têm múltiplos valores monetários
      if (config.key === "crescimento_mom") {
        return data.vendasMesAnterior != null
          ? `Receita: ${formatBRL(data.vendasMes)} · Receita anterior: ${formatBRL(data.vendasMesAnterior)}`
          : `Receita: ${formatBRL(data.vendasMes)}`;
      } else if (config.key === "lucro_bruto") {
        return `Receita: ${formatBRL(data.vendasMes)} · COGS: ${formatBRL(data.cogsReal)}`;
      }
    }

    return subtitle;
  };

  return (
    <div className="flex flex-wrap gap-2">
      {DASHBOARD_CARDS.map((config) => {
        let value = config.getValue(data);
        let subtitle = config.getSubtitle(data);

        // Formatação especial para lucro bruto
        if (config.key === "lucro_bruto") {
          value = `${formatBRL(data.lucroBrutoMes)} (${data.margemBrutaPerc?.toFixed?.(2) ?? Number(data.margemBrutaPerc || 0).toFixed(2)}%)`;
        } else {
          value = formatValue(value, config);
        }

        subtitle = formatSubtitle(subtitle, config, data);

        return (
          <Card
            key={config.key}
            title={config.title}
            value={value}
            subtitle={subtitle}
            onClick={() => onCardClick(config.key)}
          />
        );
      })}
    </div>
  );
}
