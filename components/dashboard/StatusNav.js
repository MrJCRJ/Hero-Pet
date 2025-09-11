// components/dashboard/StatusNav.js
import { useState, useRef, useEffect } from "react";
import { DatabaseCard } from "./DatabaseCard";
import { WebserverCard } from "./WebserverCard";
import { StatusDot } from "../common/StatusDot.js";

function StatusPopover({ children, open, hover }) {
  return (
    <div
      className={`
        absolute top-full left-0 mt-2 z-20 shadow-lg
        ${hover ? "hidden group-hover:block" : ""}
      `}
    >
      {open && (
        <div className="bg-white border border-gray-200 rounded-md p-3 w-64">
          {children}
          {!hover && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              Clique em qualquer lugar para fechar
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusNav({ status, lastUpdate, compact = false }) {
  const [openCard, setOpenCard] = useState(null);
  const cardRef = useRef(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        setOpenCard(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div className="flex space-x-4" ref={cardRef}>
      {items.map((item) => {
        const CardComponent = item.id === "database" ? DatabaseCard : WebserverCard;
        const isOpen = openCard === item.id;

        return (
          <div
            key={item.id}
            className="relative group cursor-pointer"
            onClick={() => setOpenCard(isOpen ? null : item.id)}
          >
            {/* Label + status */}
            <div className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors">
              <StatusDot status={item.data.status} />
              <span className="text-xs font-medium">{item.label}</span>
            </div>

            {/* Tooltip hover */}
            <StatusPopover open hover>
              <CardComponent {...{ [item.id]: item.data }} compact />
            </StatusPopover>

            {/* Clique → mantém aberto */}
            <StatusPopover open={isOpen}>
              <CardComponent {...{ [item.id]: item.data }} compact />
            </StatusPopover>
          </div>
        );
      })}
      {/* Última atualização */}
      {lastUpdate && (
        <span className="text-xs text-gray-500 text-center">
          Última atualização: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
