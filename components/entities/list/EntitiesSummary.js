import React from "react";

function Badge({ label, value }) {
  return (
    <span className="badge badge-soft">
      <strong className="mr-1">{label}:</strong> {value}
    </span>
  );
}

function SummaryBadges({ entries, prefix }) {
  if (!entries) return null;
  return Object.entries(entries).map(([k, v]) => (
    <Badge key={prefix + k} label={`${prefix}${k}`} value={v} />
  ));
}

function AggregatePercent({ summary }) {
  if (!summary) return null;
  const addr = summary.percent_address_fill?.completo ?? 0;
  const contact = summary.percent_contact_fill?.completo ?? 0;
  const valid = (() => {
    const totalStatus = Object.values(summary.by_status || {}).reduce(
      (a, b) => a + b,
      0,
    );
    const validCount = summary.by_status?.valid || 0;
    return totalStatus
      ? Number(((validCount / totalStatus) * 100).toFixed(1))
      : 0;
  })();
  return (
    <div className="flex gap-2 flex-wrap text-[10px]">
      <Badge label="% Doc. válidos" value={`${valid}%`} />
      <Badge label="% Endereço completo" value={`${addr}%`} />
      <Badge label="% Contato completo" value={`${contact}%`} />
    </div>
  );
}

export function EntitiesSummary({ summary }) {
  if (!summary) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 flex-wrap text-[10px]">
        <Badge label="Total" value={summary.total} />
        <SummaryBadges entries={summary.by_status} prefix="Status:" />
        {summary.by_pending && (
          <SummaryBadges entries={summary.by_pending} prefix="Pending:" />
        )}
        {summary.by_address_fill && (
          <SummaryBadges entries={summary.by_address_fill} prefix="Endereço:" />
        )}
        {summary.by_contact_fill && (
          <SummaryBadges entries={summary.by_contact_fill} prefix="Contato:" />
        )}
      </div>
      <AggregatePercent summary={summary} />
    </div>
  );
}
