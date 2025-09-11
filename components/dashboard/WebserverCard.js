// components/dashboard/WebserverCard.js
import { InfoList } from "components/common/InfoList";
import { Section } from "components/common/Section";

function mapWebserverInfo(webserver) {
  return {
    Provedor: webserver.provider,
    Ambiente: webserver.environment,
    Região: webserver.vercel_region || webserver.aws_region || "N/A",
    "Fuso horário": webserver.timezone,
    Versão: webserver.version,
  };
}

export function WebserverCard({ webserver, compact = false }) {
  return (
    <div>
      {!compact && <h3 className="font-semibold mb-2">Web Server</h3>}
      <Section title="Configuração">
        <InfoList data={mapWebserverInfo(webserver)} />
      </Section>
    </div>
  );
}
