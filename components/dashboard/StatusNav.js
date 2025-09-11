import { useState, useRef, useEffect } from "react";
import { DatabaseCard } from "./DatabaseCard";
import { WebserverCard } from "./WebserverCard";
import { StatusDot } from "../common/StatusDot.js";

// 🔹 Popover de status (hover ou clique)
function StatusPopover({ children, open, hover }) {
  return (
    <div
      className={`
        absolute top-full left-0 mt-2 z-20 shadow-lg
        ${hover ? "hidden group-hover:block" : ""}
      `}
    >
      {open && (
        <div className="bg-white border border-gray-200 rounded-md p-3 w-64 transition-opacity duration-300">
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

// 🔹 Navbar compacta de status
export function StatusNav({ status, lastUpdate, compact = false }) {
  const [openCard, setOpenCard] = useState(null);
  const cardRef = useRef(null);

  // Atualiza o relógio a cada segundo
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fecha popover ao clicar fora
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

  // Diferença em segundos desde o último fetch
  const secondsSinceUpdate = lastUpdate
    ? Math.floor((currentTime - new Date(lastUpdate)) / 1000)
    : 0;

  // Define cores da última atualização
  let updateColor = "text-gray-500";
  if (secondsSinceUpdate <= 30) updateColor = "text-green-500";
  else if (secondsSinceUpdate <= 50) updateColor = "text-yellow-500";
  else updateColor = "text-red-500";

  return (
    <div className="flex flex-col space-y-1" ref={cardRef}>
      <div className="flex space-x-4">
        {items.map((item) => {
          const CardComponent = item.id === "database" ? DatabaseCard : WebserverCard;
          const isOpen = openCard === item.id;

          return (
            <div
              key={item.id}
              className="relative group cursor-pointer"
              onClick={() => setOpenCard(isOpen ? null : item.id)}
            >
              {/* Label + bolinha de status */}
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
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
      </div>

      {/* Última atualização dinâmica com animação de pulso */}
      {lastUpdate && (
        <div
          className={`
            text-xs text-center mt-1 transition-colors duration-500
            ${updateColor} ${secondsSinceUpdate <= 30 ? "animate-pulse" : ""}
          `}
        >
          Última atualização: {new Date(currentTime).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
