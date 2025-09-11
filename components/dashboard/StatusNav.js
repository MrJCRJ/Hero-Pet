// components/dashboard/StatusNav.js
import { useState } from "react";
import { DatabaseCard } from "./DatabaseCard";
import { WebserverCard } from "./WebserverCard";

function StatusDot({ status }) {
  const normalized = String(status).toLowerCase();
  const colors = {
    healthy: "bg-green-500",
    degraded: "bg-yellow-500",
    warning: "bg-yellow-500",
    offline: "bg-red-500",
    error: "bg-red-500",
    down: "bg-red-500",
  };

  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${colors[normalized] || "bg-gray-400"
        }`}
    />
  );
}

export function StatusNav({ status, compact = false }) {
  const [openCard, setOpenCard] = useState(null);

  if (!status) {
    return (
      <p className="text-center text-sm text-red-500">
        Não foi possível carregar os dados.
      </p>
    );
  }

  const { database, webserver } = status.dependencies;

  const items = [
    { id: "database", label: compact ? "DB" : "Banco de Dados", data: database },
    { id: "webserver", label: compact ? "WS" : "Web Server", data: webserver },
  ];

  return (
    <div className="flex space-x-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="relative group cursor-pointer"
          onClick={() => setOpenCard(openCard === item.id ? null : item.id)}
        >
          <div className="flex items-center space-x-1">
            <span className="text-xs font-medium">{item.label}</span>
            <StatusDot status={item.data.status} />
          </div>

          {/* Tooltip ao passar o mouse */}
          <div className="absolute hidden group-hover:block top-full left-0 mt-2 z-10">
            <div className="bg-white border shadow-lg rounded-md p-3 w-64">
              {item.id === "database" ? (
                <DatabaseCard database={item.data} compact />
              ) : (
                <WebserverCard webserver={item.data} compact />
              )}
            </div>
          </div>

          {/* Clique → mantém aberto */}
          {openCard === item.id && (
            <div className="absolute top-full left-0 mt-2 z-20">
              <div className="bg-white border shadow-xl rounded-md p-3 w-64">
                {item.id === "database" ? (
                  <DatabaseCard database={item.data} compact />
                ) : (
                  <WebserverCard webserver={item.data} compact />
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
