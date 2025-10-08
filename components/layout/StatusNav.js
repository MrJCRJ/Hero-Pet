import { StatusDot } from "../entities/shared/StatusDot.js";

// 🔹 Navbar simples de status (apenas bolinha + label)
export function StatusNav({ status, compact = false }) {
  if (!status) {
    return (
      <p className="text-center text-sm text-red-500">
        Não foi possível carregar os dados.
      </p>
    );
  }

  // Tratar estrutura da API: status pode ser { data: { dependencies: ... } } ou apenas { dependencies: ... }
  const statusData = status.data || status;
  const dependencies = statusData.dependencies;

  if (!dependencies) {
    return (
      <p className="text-center text-sm text-yellow-500">
        Dados de status incompletos.
      </p>
    );
  }

  const { database, webserver } = dependencies;

  const items = [
    {
      id: "database",
      label: compact ? "DB" : "Banco de Dados",
      data: database,
    },
    {
      id: "webserver",
      label: compact ? "WS" : "Web Server",
      data: webserver,
    },
  ];

  return (
    <div className="flex space-x-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center space-x-2 px-3 py-1 rounded-md"
        >
          <StatusDot status={item.data.status} />
          <span className="text-xs font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
