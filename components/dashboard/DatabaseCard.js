// components/dashboard/DatabaseCard.js
import { Info } from "components/common/Info";
import { InfoList } from "components/common/InfoList";
import { Section } from "components/common/Section";

// Ícone para o banco de dados
const DatabaseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5 inline mr-2 text-[var(--color-accent)]"
  >
    <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875z" />
    <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 001.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 001.897 1.384C6.809 12.164 9.315 12.75 12 12.75z" />
    <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 15.914 9.315 16.5 12 16.5z" />
    <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 19.664 9.315 20.25 12 20.25z" />
  </svg>
);

function mapLatency(latency) {
  return {
    "Primeira query": {
      value: `${latency.first_query.toFixed(2)} ms`,
      status:
        latency.first_query < 30
          ? "good"
          : latency.first_query < 100
            ? "warning"
            : "bad",
    },
    "Segunda query": {
      value: `${latency.second_query.toFixed(2)} ms`,
      status:
        latency.second_query < 30
          ? "good"
          : latency.second_query < 100
            ? "warning"
            : "bad",
    },
    "Terceira query": {
      value: `${latency.third_query.toFixed(2)} ms`,
      status:
        latency.third_query < 30
          ? "good"
          : latency.third_query < 100
            ? "warning"
            : "bad",
    },
  };
}

export function DatabaseCard({ database, compact = false }) {
  const connectionPercentage =
    (database.current_connections / database.max_connections) * 100;
  const connectionStatus =
    connectionPercentage < 70
      ? "good"
      : connectionPercentage < 90
        ? "warning"
        : "bad";

  const connectionData = {
    Conexões: {
      value: `${database.current_connections} / ${database.max_connections}`,
      status: connectionStatus,
      title: `${Math.round(connectionPercentage)}% utilizadas`,
    },
  };

  return (
    <div className="database-card bg-[var(--color-bg-secondary)] rounded-lg shadow-md p-4">
      {!compact && (
        <div className="flex items-center mb-3">
          <DatabaseIcon />
          <h3
            className="font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Banco de Dados
          </h3>
        </div>
      )}

      <div className="space-y-3">
        <Info label="Versão" value={database.version} />

        <InfoList data={connectionData} />

        <div className="w-full bg-[var(--color-border)] rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${
              connectionStatus === "good"
                ? "bg-green-500"
                : connectionStatus === "warning"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, connectionPercentage)}%` }}
          ></div>
        </div>
      </div>

      <Section title="Latência (ms)" className="mt-3">
        <InfoList data={mapLatency(database.latency)} />
      </Section>

      {!compact && database.opened_connections !== undefined && (
        <div
          className="mt-3 text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Conexões abertas: {database.opened_connections}
        </div>
      )}
    </div>
  );
}
