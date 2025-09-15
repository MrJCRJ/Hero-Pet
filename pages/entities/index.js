import { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import { formatCpfCnpj } from "components/entity/utils";

// Simples UI de listagem de entidades com filtros status/pending
export default function EntitiesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (pendingOnly) params.set("pending", "true");
    params.set("meta", "1");
    return params.toString();
  }, [statusFilter, pendingOnly]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/entities?${queryString}`);
        if (!res.ok) throw new Error(`Falha ao carregar entities: ${res.status}`);
        const data = await res.json();
        setRows(data.data);
        setTotal(data.total);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [queryString]);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch(`/api/v1/entities/summary`);
        if (!res.ok) return;
        const data = await res.json();
        setSummary(data);
      } catch (e) {
        // Silenciamos erros de summary para não bloquear a página principal.
        // Poderíamos futuramente adicionar um toast/log.
      }
    }
    loadSummary();
  }, []);

  return (
    <>
      <Head>
        <title>Entities</title>
      </Head>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Entities</h1>

        {summary && (
          <div className="flex gap-4 text-sm">
            <Badge label="Total" value={summary.total} />
            {Object.entries(summary.by_status || {}).map(([k, v]) => (
              <Badge key={k} label={`Status:${k}`} value={v} />
            ))}
            {Object.entries(summary.by_pending || {}).map(([k, v]) => (
              <Badge key={k} label={`Pending:${k}`} value={v} />
            ))}
          </div>
        )}

        <Filters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          pendingOnly={pendingOnly}
          onPendingChange={setPendingOnly}
          loading={loading}
        />

        {error && (
          <div className="text-red-600 text-sm border border-red-300 bg-red-50 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <Table rows={rows} loading={loading} total={total} />
      </div>
    </>
  );
}

function Filters({ statusFilter, onStatusChange, pendingOnly, onPendingChange, loading }) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col">
        <label htmlFor="filtro-status" className="text-xs font-medium mb-1">Status</label>
        <select
          id="filtro-status"
          disabled={loading}
          className="border rounded px-2 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">(todos)</option>
          <option value="pending">pending</option>
          <option value="provisional">provisional</option>
          <option value="valid">valid</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={pendingOnly}
          disabled={loading}
          onChange={(e) => onPendingChange(e.target.checked)}
        />
        Apenas marcados como pending (checkbox)
      </label>
      {loading && <span className="text-xs text-gray-500 animate-pulse">Carregando...</span>}
    </div>
  );
}

function Table({ rows, loading, total }) {
  return (
    <div className="border rounded overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <Th>Nome</Th>
            <Th>Tipo</Th>
            <Th>Documento</Th>
            <Th>Status</Th>
            <Th>Pending?</Th>
            <Th>Criado</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan={6} className="text-center py-6 text-gray-500">
                Nenhum registro encontrado
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-t hover:bg-gray-50">
              <Td>{r.name}</Td>
              <Td>{r.entity_type}</Td>
              <Td>{r.document_digits ? formatCpfCnpj(r.document_digits) : (r.document_pending ? "(pendente)" : "—")}</Td>
              <Td>
                <StatusBadge status={r.document_status} />
              </Td>
              <Td>{r.document_pending ? "Sim" : "Não"}</Td>
              <Td>{new Date(r.created_at).toLocaleString()}</Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 text-xs text-gray-600">
            <td colSpan={6} className="px-3 py-2">
              Total exibido: {rows.length} / Total filtrado: {total}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-3 py-2 font-medium">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3 py-2 whitespace-nowrap align-top">{children}</td>;
}

function StatusBadge({ status }) {
  const map = {
    valid: 'badge badge-success',
    pending: 'badge badge-warning',
    provisional: 'badge badge-info'
  };
  const cls = map[status] || 'badge';
  return <span className={cls}>{status}</span>;
}

function Badge({ label, value }) {
  return <span className="badge badge-soft"><strong className="mr-1">{label}:</strong> {value}</span>;
}
