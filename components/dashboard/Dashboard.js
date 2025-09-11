import { DatabaseCard } from "./DatabaseCard";
import { WebserverCard } from "./WebserverCard";
import { CommitCard } from "./CommitCard";

// 🔹 Componente de dashboard
export function Dashboard({ status, lastUpdate, onRefresh }) {
  if (!status)
    return (
      <p className="text-center text-sm">Não foi possível carregar os dados.</p>
    );

  const { database, webserver } = status.dependencies;

  return (
    <>
      <p className="text-center text-gray-500 mb-4 text-xs">
        {lastUpdate && `Última atualização: ${lastUpdate.toLocaleTimeString()}`}
      </p>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <DatabaseCard database={database} />
        <WebserverCard webserver={webserver} />
        <CommitCard webserver={webserver} />
      </div>

      <div className="text-center mt-4">
        <button
          onClick={onRefresh}
          className="bg-indigo-600 text-white rounded-md px-3 py-1 text-sm font-semibold hover:bg-indigo-700"
        >
          Atualizar
        </button>
      </div>
    </>
  );
}
