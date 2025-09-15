import { useStatus } from "../hooks/useStatus";
import { useAuth } from "../hooks/useAuth";
import { useFormManager } from "../hooks/useFormManager";
import { AccessForm } from "../components/admin/AccessForm";
import { AdminHeader } from "../components/admin/AdminHeader";
import { StatusNav } from "../components/layout/StatusNav";
import { ThemeToggle } from "../components/ThemeToggle";
import { EntityForm } from "../components/EntityForm";
import { PedidoForm } from "../components/PedidoForm";
import { Button } from "../components/ui/Button";
import { formatCpfCnpj } from "components/entity/utils";
import React, { useState } from "react";
import { usePaginatedEntities } from "hooks/usePaginatedEntities";

const formConfig = {
  entity: {
    label: "Cadastro",
    Component: EntityForm,
  },
  order: {
    label: "Pedido",
    Component: PedidoForm,
  },
};

function Home() {
  const { status, loading, lastUpdate } = useStatus();
  const {
    showAdminPanel,
    accessCode,
    incorrectCode,
    setAccessCode,
    handleAccessCodeSubmit,
    handleLogout,
  } = useAuth();
  const { handleShowForm, getFormProps, isFormVisible } = useFormManager();
  const [showEntitiesList, setShowEntitiesList] = useState(false);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors">
        <h1 className="text-sm">Carregando...</h1>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen text-sm transition-colors">
      {!showAdminPanel ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-bold text-center">Hero-Pet</h1>
            <ThemeToggle />
          </div>
          <AccessForm
            accessCode={accessCode}
            setAccessCode={setAccessCode}
            onSubmit={handleAccessCodeSubmit}
            incorrectCode={incorrectCode}
          />
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-lg font-bold text-center">Sistema Hero-Pet</h1>
            <StatusNav status={status} lastUpdate={lastUpdate} compact />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <AdminHeader onLogout={handleLogout} user={{ name: "José" }} />
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            {Object.entries(formConfig).map(([key, { label }]) => (
              <Button
                key={key}
                onClick={() => handleShowForm(key)}
                variant={isFormVisible(key) ? "primary" : "secondary"}
                fullWidth={false}
              >
                {label}
              </Button>
            ))}
            <Button
              onClick={() => setShowEntitiesList((v) => !v)}
              variant={showEntitiesList ? "primary" : "secondary"}
              fullWidth={false}
            >
              {showEntitiesList ? "Fechar Lista" : "Listar Entidades"}
            </Button>
          </div>
          {Object.entries(formConfig).map(([key, { Component }]) =>
            isFormVisible(key) ? (
              <Component key={key} {...getFormProps(key)} />
            ) : null,
          )}
          {showEntitiesList && (
            <div className="mt-8 border-t pt-6">
              <EntitiesList />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;

// --- LISTAGEM DE ENTIDADES INLINE ---

function EntitiesList() {
  const {
    rows,
    total,
    summary,
    loading,
    loadingMore,
    error,
    statusFilter,
    pendingOnly,
    canLoadMore,
    setStatusFilter,
    setPendingOnly,
    loadMore,
  } = usePaginatedEntities({ limit: 20 });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-2">
          <h2 className="font-semibold">Entidades Cadastradas</h2>
          <p className="text-xs text-gray-500">
            Filtros não bloqueiam uso dos formulários acima.
          </p>
          {summary && (
            <div className="flex gap-2 flex-wrap text-xs">
              <Badge label="Total" value={summary.total} />
              {Object.entries(summary.by_status || {}).map(([k, v]) => (
                <Badge key={k} label={`Status:${k}`} value={v} />
              ))}
              {Object.entries(summary.by_pending || {}).map(([k, v]) => (
                <Badge key={k} label={`Pending:${k}`} value={v} />
              ))}
            </div>
          )}
        </div>
        <Filters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          pendingOnly={pendingOnly}
          onPendingChange={setPendingOnly}
          loading={loading}
        />
      </div>
      {error && (
        <div className="text-red-600 text-xs border border-red-300 bg-red-50 px-3 py-2 rounded">
          {error}
        </div>
      )}
      <EntitiesTable
        rows={rows}
        loading={loading}
        total={total}
        onLoadMore={loadMore}
        canLoadMore={canLoadMore}
        loadingMore={loadingMore}
      />
    </div>
  );
}

function Filters({
  statusFilter,
  onStatusChange,
  pendingOnly,
  onPendingChange,
  loading,
}) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col">
        <label
          htmlFor="entities-status-filter"
          className="text-xs font-medium mb-1"
        >
          Status
        </label>
        <select
          id="entities-status-filter"
          disabled={loading}
          className="border rounded px-2 py-1 text-xs"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">(todos)</option>
          <option value="pending">pending</option>
          <option value="provisional">provisional</option>
          <option value="valid">valid</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={pendingOnly}
          disabled={loading}
          onChange={(e) => onPendingChange(e.target.checked)}
        />
        Apenas marcados como pending
      </label>
      {loading && (
        <span className="text-[10px] text-gray-500 animate-pulse">
          Carregando...
        </span>
      )}
    </div>
  );
}

function EntitiesTable({
  rows,
  loading,
  total,
  onLoadMore,
  canLoadMore,
  loadingMore,
}) {
  return (
    <div className="border rounded overflow-x-auto">
      <table className="min-w-full text-xs">
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
              <Td>
                {r.document_digits
                  ? formatCpfCnpj(r.document_digits)
                  : r.document_pending
                    ? "(pendente)"
                    : "—"}
              </Td>
              <Td>
                <StatusBadge status={r.document_status} />
              </Td>
              <Td>{r.document_pending ? "Sim" : "Não"}</Td>
              <Td>{new Date(r.created_at).toLocaleDateString()}</Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 text-[10px] text-gray-600">
            <td colSpan={6} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span>
                  Total exibido: {rows.length} / Total filtrado: {total}
                </span>
                <div className="flex items-center gap-2">
                  {loading && (
                    <span className="text-[10px] text-gray-500 animate-pulse">
                      Carregando...
                    </span>
                  )}
                  {canLoadMore && (
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      onClick={onLoadMore}
                      loading={loadingMore}
                    >
                      Carregar mais
                    </Button>
                  )}
                  {!canLoadMore && !loading && rows.length > 0 && (
                    <span className="text-[10px] text-gray-500">
                      Fim dos resultados
                    </span>
                  )}
                </div>
              </div>
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
    valid: "badge badge-success",
    pending: "badge badge-warning",
    provisional: "badge badge-info",
  };
  const cls = map[status] || "badge";
  return <span className={cls}>{status}</span>;
}

function Badge({ label, value }) {
  return (
    <span className="badge badge-soft">
      <strong className="mr-1">{label}:</strong> {value}
    </span>
  );
}
