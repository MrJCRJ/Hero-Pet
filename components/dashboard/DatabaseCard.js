import { Card } from "components/common/Card";
import { Info } from "components/common/Info";
import { InfoList } from "components/common/InfoList";
import { Section } from "components/common/Section";

// 🔹 Componente de card do banco de dados
export function DatabaseCard({ database }) {
  const latencyData = {
    "Primeira query": database.latency.first_query.toFixed(2),
    "Segunda query": database.latency.second_query.toFixed(2),
    "Terceira query": database.latency.third_query.toFixed(2),
  };

  return (
    <Card title="Banco de Dados" status={database.status}>
      <Info label="Versão" value={database.version} />
      <Info
        label="Conexões"
        value={`${database.current_connections} / ${database.max_connections}`}
      />
      <Section title="Latência (ms)">
        <InfoList data={latencyData} />
      </Section>
    </Card>
  );
}
