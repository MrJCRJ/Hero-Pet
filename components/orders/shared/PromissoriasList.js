import React from "react";
import { truncateName, formatYMDToBR, formatBRL } from "./utils";

/**
 * Componente que lista promissórias com filtros por status
 */
export default function PromissoriasList({
  title,
  monthLabel,
  monthStr,
  status,
  expectedCount,
  expectedAmount,
  onSelect,
}) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          month: monthStr,
          status,
          limit: "100",
        }).toString();
        const res = await fetch(`/api/v1/promissorias?${qs}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro na API");
        if (alive) setRows(json.items || []);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [monthStr, status]);

  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium">
        {title} — {monthLabel}
      </p>
      {loading && <div className="opacity-70">Carregando...</div>}
      {error && <div className="text-red-500">Erro: {String(error)}</div>}
      {!loading && !error && (
        <div className="border rounded">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="text-left px-2 py-1">Pedido</th>
                <th className="text-left px-2 py-1">Parceiro</th>
                <th className="text-left px-2 py-1">Tipo</th>
                <th className="text-left px-2 py-1">Vencimento</th>
                <th className="text-right px-2 py-1">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={`${r.pedido_id}-${r.seq}-${idx}`}
                  className="border-t hover:bg-[var(--color-bg-secondary)] cursor-pointer"
                  title="Filtrar lista pelo ID do pedido"
                  onClick={() =>
                    onSelect?.({
                      q: `#${r.pedido_id}`,
                      tipo: "",
                      from: "",
                      to: "",
                    })
                  }
                >
                  <td className="px-2 py-1">
                    #{r.pedido_id} — #{r.seq}
                  </td>
                  <td className="px-2 py-1" title={r.partner_name}>
                    {truncateName(r.partner_name)}
                  </td>
                  <td className="px-2 py-1">{r.tipo}</td>
                  <td className="px-2 py-1">{formatYMDToBR(r.due_date)}</td>
                  <td className="px-2 py-1 text-right">
                    {formatBRL(r.amount)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-2 py-4 text-center opacity-70" colSpan={5}>
                    Nenhum item encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="text-xs opacity-70">
        Esperado pelo resumo: {expectedCount} itens —{" "}
        {formatBRL(expectedAmount)}
      </div>
    </div>
  );
}
