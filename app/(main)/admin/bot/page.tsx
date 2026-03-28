"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageSection } from "@/components/layout/PageSection";
import { BotMessagesTable } from "@/components/admin/BotMessagesTable";

type BotResumo = {
  pedidos_hoje: number;
  total_hoje: number;
  pedidos_em_andamento: number;
  ultima_mensagem?: string | null;
  status_bot?: string;
};

type BotStats = {
  bot: {
    conectado: boolean | null;
    redis_disponivel: boolean;
    ultima_atividade_bot?: string | null;
    total_conversas: number | null;
  };
  pedidos: {
    pedidos_hoje: number;
    receita_hoje: number;
    pedidos_em_andamento: number;
    ultima_mensagem: string | null;
  };
};

type PedidoItem = {
  produto_nome: string;
  quantidade_kg: number;
};

type BotPedido = {
  id: number;
  status: string;
  data: string;
  cliente_nome: string;
  total: number;
  itens: PedidoItem[];
};

function formatMoney(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-BR");
}

function StatusBadge({ conectado }: { conectado: boolean | null }) {
  if (conectado === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
        <span className="text-[var(--color-text-secondary)]">Desconhecido</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${conectado ? "bg-green-500" : "bg-red-500"}`} />
      <span>{conectado ? "Sim" : "Nao"}</span>
    </span>
  );
}

export default function AdminBotPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [resumo, setResumo] = React.useState<BotResumo | null>(null);
  const [stats, setStats] = React.useState<BotStats | null>(null);
  const [pedidos, setPedidos] = React.useState<BotPedido[]>([]);

  React.useEffect(() => {
    if (status === "loading") return;
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    if (role !== "admin") {
      router.replace("/entities");
      return;
    }
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [rResumo, rStats, rPedidos] = await Promise.all([
          fetch("/api/bot/resumo"),
          fetch("/api/admin/bot/stats"),
          fetch("/api/bot/pedidos"),
        ]);
        if (!rResumo.ok) throw new Error("Falha ao carregar resumo");
        if (!rPedidos.ok) throw new Error("Falha ao carregar pedidos");

        setResumo(await rResumo.json());
        setPedidos(await rPedidos.json());

        if (rStats.ok) {
          setStats(await rStats.json());
        }
      } catch (e) {
        setError((e as Error).message || "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [router, session, status]);

  if (status === "loading" || loading) {
    return (
      <PageSection title="Administracao do Bot" description="Painel operacional do WhatsApp Bot">
        <div className="text-sm text-[var(--color-text-secondary)]">Carregando...</div>
      </PageSection>
    );
  }

  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return null;

  const conectado = stats?.bot.conectado ?? null;
  const ultimaMensagem = stats?.pedidos.ultima_mensagem ?? resumo?.ultima_mensagem ?? null;
  const totalConversas = stats?.bot.total_conversas ?? null;

  return (
    <PageSection title="Administracao do Bot" description="Monitoramento operacional e pedidos do canal WhatsApp">
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {/* Metric cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <div className="text-xs text-[var(--color-text-secondary)]">Pedidos hoje</div>
          <div className="text-2xl font-semibold">{resumo?.pedidos_hoje ?? 0}</div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <div className="text-xs text-[var(--color-text-secondary)]">Receita hoje</div>
          <div className="text-2xl font-semibold">{formatMoney(resumo?.total_hoje ?? 0)}</div>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <div className="text-xs text-[var(--color-text-secondary)]">Pedidos em andamento</div>
          <div className="text-2xl font-semibold">{resumo?.pedidos_em_andamento ?? 0}</div>
        </div>
      </div>

      {/* Bot status card */}
      <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Status do Bot</h3>
          <button
            type="button"
            disabled
            className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs opacity-60"
            title="Integracao futura"
          >
            Reiniciar sessao
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">Conectado</div>
            <StatusBadge conectado={conectado} />
          </div>
          <div>
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">Ultima mensagem</div>
            <div className="text-sm">{formatDate(ultimaMensagem)}</div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">Total de conversas</div>
            <div className="text-sm">{totalConversas !== null ? totalConversas : "-"}</div>
          </div>
        </div>
      </div>

      {/* Messages table */}
      <BotMessagesTable />

      {/* Recent orders */}
      <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <h3 className="mb-3 font-semibold">Pedidos recentes</h3>
        {!pedidos.length ? (
          <div className="text-sm text-[var(--color-text-secondary)]">Nenhum pedido encontrado.</div>
        ) : (
          <div className="space-y-3">
            {pedidos.slice(0, 20).map((p) => (
              <div key={p.id} className="rounded border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <a
                    href={`/pedidos/${p.id}`}
                    className="font-medium hover:underline text-[var(--color-text-primary)]"
                  >
                    #{p.id} - {p.cliente_nome || "Cliente"}
                  </a>
                  <span>{formatMoney(p.total)}</span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {formatDate(p.data)} | Status: {p.status}
                </div>
                {!!p.itens?.length && (
                  <ul className="mt-2 list-disc pl-5 text-xs">
                    {p.itens.map((i, idx) => (
                      <li key={`${p.id}-${idx}`}>{i.produto_nome}: {i.quantidade_kg} kg</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageSection>
  );
}
