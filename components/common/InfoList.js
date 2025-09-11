// components/common/InfoList.js
import { Info } from "./Info";
import React from "react";

// 🔹 Componente genérico para renderizar Info de um objeto com suporte a valores complexos
export const InfoList = ({ data, className = "" }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Object.entries(data).map(([label, value]) => {
        // Se for um objeto complexo com propriedades específicas
        if (
          value &&
          typeof value === "object" &&
          !React.isValidElement(value)
        ) {
          const {
            value: displayValue,
            status,
            icon,
            className: valueClassName,
            title,
            ...extraProps
          } = value;

          // Determinar classes baseadas no status
          const statusClasses = {
            good: "text-green-600",
            warning: "text-yellow-600",
            bad: "text-red-600",
            healthy: "text-green-600",
            degraded: "text-yellow-600",
            offline: "text-red-600",
            error: "text-red-600",
          };

          const statusClass = statusClasses[status] || "";

          return (
            <Info
              key={label}
              label={label}
              value={
                <span
                  className={`${statusClass} ${valueClassName || ""}`}
                  {...extraProps}
                >
                  {icon && <span className="mr-1">{icon}</span>}
                  {title || displayValue || JSON.stringify(value)}
                </span>
              }
            />
          );
        }

        // Se for um elemento React válido
        if (React.isValidElement(value)) {
          return <Info key={label} label={label} value={value} />;
        }

        // Valor simples (string, número, etc.)
        return <Info key={label} label={label} value={value} />;
      })}
    </div>
  );
};
