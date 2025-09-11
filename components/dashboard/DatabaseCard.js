// components/dashboard/DatabaseCard.js
import { Info } from "components/common/Info";
import { InfoList } from "components/common/InfoList";
import { Section } from "components/common/Section";

function mapLatency(latency) {
  return {
    "Primeira query": latency.first_query.toFixed(2),
    "Segunda query": latency.second_query.toFixed(2),
    "Terceira query": latency.third_query.toFixed(2),
  };
}

export function DatabaseCard({ database, compact = false }) {
  return (
    <div>
      {!compact && <h3 className="font-semibold mb-2">Banco de Dados</h3>}
      <Info label="Versão" value={database.version} />
      <Info
        label="Conexões"
        value={`${database.current_connections} / ${database.max_connections}`}
      />
      <Section title="Latência (ms)">
        <InfoList data={mapLatency(database.latency)} />
      </Section>
    </div>
  );
}
