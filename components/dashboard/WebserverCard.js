// components/dashboard/WebserverCard.js
import { InfoList } from "components/common/InfoList";
import { Section } from "components/common/Section";

// Ícone para o webserver
const ServerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 inline mr-2 text-green-500">
    <path d="M4.08 5.227A3 3 0 0 1 6.979 3H17.02a3 3 0 0 1 2.9 2.227l2.113 7.926A5.228 5.228 0 0 0 18.75 12H5.25a5.228 5.228 0 0 0-3.284 1.153L4.08 5.227Z" />
    <path fillRule="evenodd" d="M5.25 13.5a3.75 3.75 0 1 0 0 7.5h13.5a3.75 3.75 0 1 0 0-7.5H5.25Zm10.5 4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm3.75-.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" clipRule="evenodd" />
  </svg>
);

function mapWebserverInfo(webserver) {
  const providerIcons = {
    vercel: "▲",
    aws: "☁️",
    local: "💻"
  };

  const environmentClasses = {
    production: "text-red-600 bg-red-100",
    staging: "text-yellow-600 bg-yellow-100",
    development: "text-green-600 bg-green-100"
  };

  return {
    Provedor: {
      value: webserver.provider,
      icon: providerIcons[webserver.provider] || "❓"
    },
    Ambiente: {
      value: webserver.environment,
      className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${environmentClasses[webserver.environment] || "text-gray-600 bg-gray-100"
        }`
    },
    Região: webserver.vercel_region || webserver.aws_region || "N/A",
    "Fuso horário": webserver.timezone,
    Versão: {
      value: webserver.version,
      className: "bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded"
    },
  };
}

export function WebserverCard({ webserver, compact = false }) {
  return (
    <div className="webserver-card">
      {!compact && (
        <div className="flex items-center mb-3">
          <ServerIcon />
          <h3 className="font-semibold text-gray-800">Web Server</h3>
        </div>
      )}

      <Section title="Configuração">
        <InfoList data={mapWebserverInfo(webserver)} />
      </Section>
    </div>
  );
}