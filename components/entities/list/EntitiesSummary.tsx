import React from "react";
import {
  Users,
  Building2,
  MapPin,
  Phone,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface Summary {
  total?: number;
  count_pf?: number;
  count_pj?: number;
  count_reseller?: number;
  count_final_customer?: number;
  by_status?: Record<string, number>;
  percent_address_fill?: Record<string, number>;
  percent_contact_fill?: Record<string, number>;
  by_address_fill?: Record<string, number>;
  by_contact_fill?: Record<string, number>;
}

function IndicatorCard({
  icon: Icon,
  label,
  value,
  subValue,
  tooltip,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  tooltip?: string;
  variant?: "default" | "success" | "warning";
}) {
  const iconCls =
    variant === "success"
      ? "text-green-600 dark:text-green-400"
      : variant === "warning"
        ? "text-amber-500 dark:text-amber-400"
        : "text-[var(--color-text-secondary)]";
  const card = (
    <div
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 flex items-center gap-3 min-h-[72px]"
      title={tooltip}
    >
      <Icon className={`h-8 w-8 shrink-0 ${iconCls}`} aria-hidden />
      <div className="min-w-0">
        <div className="text-xl md:text-2xl font-bold truncate">{value}</div>
        <div className="text-[10px] md:text-xs text-[var(--color-text-secondary)] truncate">
          {label}
        </div>
        {subValue && (
          <div className="text-[9px] text-[var(--color-text-secondary)]/80 mt-0.5 truncate">
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
  return card;
}

export function EntitiesSummary({ summary }: { summary: Summary | null }) {
  if (!summary) return null;

  const total = Number(summary.total) || 0;
  const countPf = Number(summary.count_pf) ?? 0;
  const countPj = Number(summary.count_pj) ?? 0;
  const countReseller = Number(summary.count_reseller) || countPf;
  const countFinalCustomer = Number(summary.count_final_customer) || 0;
  const totalStatus = Object.values(summary.by_status || {}).reduce(
    (a, b) => a + b,
    0
  );
  const validCount = Number(summary.by_status?.valid ?? 0);
  const validPct =
    totalStatus > 0 ? ((validCount / totalStatus) * 100).toFixed(1) : "0";
  const addrPct = summary.percent_address_fill?.completo ?? 0;
  const addrCompleto = summary.by_address_fill?.completo ?? 0;
  const contactPct = summary.percent_contact_fill?.completo ?? 0;
  const contactCompleto = summary.by_contact_fill?.completo ?? 0;

  const ValidIcon =
    Number(validPct) >= 80 ? CheckCircle : AlertTriangle;
  const validVariant =
    Number(validPct) >= 80 ? "success" : "warning";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <IndicatorCard
        icon={Users}
        label="Total"
        value={total}
        tooltip="Quantidade total de entidades cadastradas"
      />
      <IndicatorCard
        icon={Users}
        label="Casa de Ração"
        value={countReseller}
        tooltip="Clientes B2B (perfil de casa de ração)"
      />
      <IndicatorCard
        icon={Users}
        label="Cliente Final"
        value={countFinalCustomer}
        tooltip="Clientes PF atendidos como consumidor final"
      />
      <IndicatorCard
        icon={Building2}
        label="Fornecedores"
        value={countPj}
        tooltip="Pessoas jurídicas (PJ) cadastradas como fornecedores"
      />
      <IndicatorCard
        icon={ValidIcon}
        label="Documentos válidos"
        value={`${validPct}%`}
        subValue={total > 0 ? `${validCount}/${total}` : undefined}
        tooltip={`${validCount} de ${total} entidades com documento válido`}
        variant={validVariant}
      />
      <IndicatorCard
        icon={MapPin}
        label="Endereço completo"
        value={`${addrPct}%`}
        subValue={total > 0 ? `${addrCompleto}/${total}` : undefined}
        tooltip={`${addrCompleto} de ${total} com CEP e número preenchidos`}
        variant={addrPct >= 80 ? "success" : addrPct >= 50 ? "warning" : "default"}
      />
      <IndicatorCard
        icon={Phone}
        label="Contato completo"
        value={`${contactPct}%`}
        subValue={total > 0 ? `${contactCompleto}/${total}` : undefined}
        tooltip={`${contactCompleto} de ${total} com telefone e e-mail válidos`}
        variant={contactPct >= 80 ? "success" : contactPct >= 50 ? "warning" : "default"}
      />
    </div>
  );
}
