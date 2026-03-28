"use client";

import React from "react";

type BotMessage = {
  phone: string;
  timestamp: string;
  direction: "in" | "out";
  content: string;
};

type MessagesResponse = {
  messages: BotMessage[];
  total: number;
  limit: number;
  offset: number;
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("pt-BR");
}

export function BotMessagesTable() {
  const [data, setData] = React.useState<MessagesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [unavailable, setUnavailable] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [phone, setPhone] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const limit = 50;

  const fetchMessages = React.useCallback(async (params: {
    phone: string;
    dateFrom: string;
    dateTo: string;
    offset: number;
  }) => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", String(limit));
      qs.set("offset", String(params.offset));
      if (params.phone) qs.set("phone", params.phone);
      if (params.dateFrom) qs.set("date_from", params.dateFrom);
      if (params.dateTo) qs.set("date_to", params.dateTo);

      const res = await fetch(`/api/admin/bot/messages?${qs.toString()}`);
      if (res.status === 503) {
        setUnavailable(true);
        return;
      }
      if (!res.ok) throw new Error("Falha ao carregar mensagens");
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMessages({ phone, dateFrom, dateTo, offset });
  }, [fetchMessages, phone, dateFrom, dateTo, offset]);

  const handleReload = () => {
    fetchMessages({ phone, dateFrom, dateTo, offset });
  };

  if (unavailable) {
    return (
      <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-950/30">
        <h3 className="mb-1 font-semibold text-yellow-800 dark:text-yellow-300">Historico de mensagens</h3>
        <p className="text-sm text-yellow-700 dark:text-yellow-400">
          Funcionalidade indisponivel. Redis nao configurado.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Ultimas mensagens</h3>
        <button
          type="button"
          onClick={handleReload}
          className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-primary)] transition-colors"
        >
          Recarregar
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Filtrar por telefone"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setOffset(0); }}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setOffset(0); }}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setOffset(0); }}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs"
        />
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <div className="text-sm text-[var(--color-text-secondary)]">Carregando...</div>
      ) : !data?.messages.length ? (
        <div className="text-sm text-[var(--color-text-secondary)]">Nenhuma mensagem encontrada.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-secondary)]">
                  <th className="pb-2 pr-3">Telefone</th>
                  <th className="pb-2 pr-3">Data/Hora</th>
                  <th className="pb-2 pr-3">Direcao</th>
                  <th className="pb-2">Conteudo</th>
                </tr>
              </thead>
              <tbody>
                {data.messages.map((m, i) => (
                  <tr key={`${m.timestamp}-${i}`} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2 pr-3 font-mono">{m.phone}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(m.timestamp)}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        m.direction === "in"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                      }`}>
                        {m.direction === "in" ? "Entrada" : "Saida"}
                      </span>
                    </td>
                    <td className="py-2 max-w-xs truncate" title={m.content}>
                      {m.content.length > 100 ? m.content.slice(0, 100) + "..." : m.content}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span>{data.total} mensagem(ns) no total</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="rounded border border-[var(--color-border)] px-2 py-1 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={offset + limit >= data.total}
                onClick={() => setOffset(offset + limit)}
                className="rounded border border-[var(--color-border)] px-2 py-1 disabled:opacity-40"
              >
                Proximo
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
