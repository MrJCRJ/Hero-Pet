import { Card } from "components/common/Card";
import { InfoList } from "components/common/InfoList";

// 🔹 Componente de card do webserver
export function WebserverCard({ webserver }) {
  const region = webserver.vercel_region || webserver.aws_region || "N/A";
  const infoData = {
    Provedor: webserver.provider,
    Ambiente: webserver.environment,
    Região: region,
    "Fuso horário": webserver.timezone,
    Versão: webserver.version,
  };

  return (
    <Card title="Web Server" status={webserver.status}>
      <InfoList data={infoData} />
    </Card>
  );
}
