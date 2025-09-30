import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import LineAreaChart from "components/common/LineAreaChart";
import { formatBRL } from "components/common/format";
import { Modal } from "components/common/Modal";
import { formatYMDToBR } from "components/common/date";
import DualLineChart from "components/common/DualLineChart";

function truncateName(name, max = 18) {
  if (!name) return "";
  const str = String(name);
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export default function OrdersDashboard({ month: monthProp }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null); // string key
  const [month, setMonth] = useState(() => {
    // Ordem de precedência: prop > localStorage > current month
    if (monthProp) return monthProp;
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("orders:month");
        if (stored && /^\d{4}-\d{2}$/.test(stored)) return stored;
      } catch (_) {
        /* ignore */
      }
    }
    return yyyyMM(new Date());
  });

  // Persiste sempre que mudar manualmente
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        window.localStorage.setItem("orders:month", month);
      }
    } catch (_) {
      /* noop */
    }
  }, [month]);

  useEffect(() => {
    if (monthProp && /^\d{4}-\d{2}$/.test(monthProp)) setMonth(monthProp);
  }, [monthProp]);

  const label = useMemo(() => monthToLabel(month), [month]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = month ? `?month=${encodeURIComponent(month)}` : "";
        const res = await fetch(`/api/v1/pedidos/summary${qs}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Falha ao carregar resumo");
        // Só define se vier num formato esperado; caso contrário, não renderiza
        const looksOk =
          json &&
          typeof json === "object" &&
          json.promissorias &&
          typeof json.vendasMes !== "undefined";
        if (mounted && looksOk) setData(json);
      } catch (e) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    // Dispatch inicial (montagem)
    try {
      const { from, to } = boundsFromYYYYMM(month) || {};
      if (from && to) {
        window.dispatchEvent(
          new CustomEvent("orders:set-filters", {
            detail: { from, to },
          }),
        );
      }
    } catch (_) {
      // ignore
    }
    // Sincroniza filtros da lista principal com o mês (from/to)
    try {
      const { from, to } = boundsFromYYYYMM(month) || {};
      if (from && to) {
        window.dispatchEvent(
          new CustomEvent("orders:set-filters", {
            detail: { from, to },
          }),
        );
      }
    } catch (_) {
      // noop
    }
    return () => {
      mounted = false;
    };
  }, [month]);

  const Card = ({ title, value, subtitle, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="text-left flex-1 min-w-[180px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-3 hover:bg-[var(--color-bg-primary)] transition-colors cursor-pointer"
    >
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
      {subtitle ? (
        <div className="text-[11px] opacity-70 mt-1">{subtitle}</div>
      ) : null}
    </button>
  );

  const monthInputRef = useRef(null);
  const openMonthPicker = useCallback(() => {
    const el = monthInputRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === "function") {
        el.showPicker();
      } else {
        el.focus();
      }
    } catch (_) {
      el.focus();
    }
  }, []);
  const onMonthKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMonthPicker();
      }
    },
    [openMonthPicker],
  );

  if (loading && !data) {
    return <div className="mb-3 text-sm opacity-70">Carregando resumo...</div>;
  }
  if (error) {
    return (
      <div className="mb-3 text-sm text-red-500">Erro: {String(error)}</div>
    );
  }
  if (!data) return null;

  const m = data;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="text-xs opacity-70">Resumo de {label}</div>
        <div className="flex items-center gap-2">
          <input
            ref={monthInputRef}
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            onClick={openMonthPicker}
            onKeyDown={onMonthKeyDown}
            aria-label="Selecionar mês do resumo"
            className="text-sm px-2 py-1 border rounded bg-[var(--color-bg-primary)] border-[var(--color-border)] calendar-icon-white fallback-icon cursor-pointer"
          />
          <button
            className="text-xs underline opacity-80 hover:opacity-100"
            onClick={() => setShowHelp(true)}
          >
            Entenda os cálculos
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Card
          title="Crescimento (MoM)"
          value={
            m.crescimentoMoMPerc == null
              ? "—"
              : `${Number(m.crescimentoMoMPerc).toFixed(2)}%`
          }
          subtitle={
            m.vendasMesAnterior != null
              ? `Receita: ${formatBRL(m.vendasMes)} · Receita anterior: ${formatBRL(m.vendasMesAnterior)}`
              : `Receita: ${formatBRL(m.vendasMes)}`
          }
          onClick={() => setSelectedCard("crescimento_mom")}
        />
        <Card
          title="Lucro bruto"
          value={`${formatBRL(m.lucroBrutoMes)} (${m.margemBrutaPerc?.toFixed?.(2) ?? Number(m.margemBrutaPerc || 0).toFixed(2)}%)`}
          subtitle={`Receita: ${formatBRL(m.vendasMes)} · COGS: ${formatBRL(m.cogsReal)}`}
          onClick={() => setSelectedCard("lucro_bruto")}
        />
        <Card
          title="Compras do mês"
          value={formatBRL(m.comprasMes)}
          onClick={() => setSelectedCard("comprasMes")}
        />
        <Card
          title="Promissórias pendentes (mês)"
          value={`${m.promissorias?.mesAtual?.pendentes?.count ?? 0} itens`}
          subtitle={formatBRL(m.promissorias?.mesAtual?.pendentes?.valor ?? 0)}
          onClick={() => setSelectedCard("promissorias_pendentes")}
        />
        <Card
          title="Promissórias atrasadas (mês)"
          value={`${m.promissorias?.mesAtual?.atrasados?.count ?? 0} itens`}
          subtitle={formatBRL(m.promissorias?.mesAtual?.atrasados?.valor ?? 0)}
          onClick={() => setSelectedCard("promissorias_atrasadas")}
        />
        <Card
          title="Vão para o próximo mês"
          value={`${m.promissorias.proximoMes.pendentes.count} itens`}
          subtitle={formatBRL(m.promissorias.proximoMes.pendentes.valor)}
          onClick={() => setSelectedCard("proximo_mes")}
        />
        <Card
          title="Vieram de meses anteriores"
          value={`${m.promissorias.deMesesAnteriores.emAberto.count} itens`}
          subtitle={formatBRL(m.promissorias.deMesesAnteriores.emAberto.valor)}
          onClick={() => setSelectedCard("carry_over")}
        />
      </div>
      {selectedCard && (
        <InfoModal
          monthLabel={label}
          monthStr={month}
          data={m}
          cardKey={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
      {showHelp && (
        <Modal
          title="Como calculamos o resumo"
          onClose={() => setShowHelp(false)}
        >
          <div className="space-y-3 text-sm">
            <p>
              Os valores exibidos consideram o mês selecionado (YYYY-MM) em dois
              eixos principais: emissão de pedidos e vencimento de promissórias.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Compras do mês</strong>: soma de total_liquido +
                frete_total dos pedidos com tipo &quot;COMPRA&quot; cuja{" "}
                <em>data_emissao</em> está dentro do mês selecionado.
              </li>
              <li>
                <strong>Promissórias (mês)</strong>: classificadas por{" "}
                <em>due_date</em> dentro do mês selecionado. São consideradas{" "}
                <em>Pagas</em> quando possuem <code>paid_at</code> definida;
                <em>Pendentes</em> quando <code>paid_at</code> é nulo e o
                vencimento ainda não passou;
                <em>Atrasadas</em> quando <code>paid_at</code> é nulo e o
                vencimento já passou.
              </li>
              <li>
                <strong>Vão para o próximo mês</strong>: promissórias em aberto
                (sem <code>paid_at</code>) cujo <em>due_date</em> está no mês
                imediatamente seguinte ao selecionado.
              </li>
              <li>
                <strong>Vieram de meses anteriores</strong>: promissórias em
                aberto (sem <code>paid_at</code>) cujo <em>due_date</em> é
                anterior ao mês selecionado (carry-over).
              </li>
            </ul>
            <p>
              Observação: os totais de pedidos não dependem do pagamento; o
              parcelamento (promissórias) reflete os recebíveis/pagáveis por
              vencimento.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function yyyyMM(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthToLabel(yyyyDashMM) {
  if (!/^\d{4}-\d{2}$/.test(String(yyyyDashMM || "")))
    return String(yyyyDashMM || "");
  const [y, m] = yyyyDashMM.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  // Ex.: set/2025
  const monthShort = d
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return `${monthShort}/${y}`;
}

function InfoModal({ cardKey, data, monthLabel, monthStr, onClose }) {
  const titleMap = {
    comprasMes: "Compras do mês",
    crescimento_mom: "Crescimento (mês vs. anterior)",
    lucro_bruto: "Lucro bruto",
    promissorias_pendentes: "Promissórias pendentes (mês)",
    promissorias_atrasadas: "Promissórias atrasadas (mês)",
    proximo_mes: "Vão para o próximo mês",
    carry_over: "Vieram de meses anteriores",
  };
  const t = titleMap[cardKey] || "Detalhes";

  const onSelect = (detail) => {
    try {
      window.dispatchEvent(new CustomEvent("orders:set-filters", { detail }));
    } catch (e) {
      // noop
    }
    onClose?.();
  };

  const content = (() => {
    switch (cardKey) {
      case "comprasMes":
        return (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">
                Total de Compras — {monthLabel}: {formatBRL(data.comprasMes)}
              </div>
              {typeof data.crescimentoComprasMoMPerc === "number" && (
                <div className="text-xs opacity-70 mt-0.5">
                  Vs mês anterior: {data.crescimentoComprasMoMPerc}% (Anterior: {formatBRL(data.comprasMesAnterior)})
                </div>
              )}
              <ComprasHistoryChart comprasHistory={data.comprasHistory} />
            </div>
            <div className="pt-2 border-t border-[var(--color-border)]">
              <button
                onClick={() =>
                  onSelect({ tipo: "COMPRA", from: boundsFromYYYYMM(monthStr).from, to: boundsFromYYYYMM(monthStr).to })
                }
                className="px-3 py-1.5 text-xs rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)]"
              >
                Ver compras do mês na lista
              </button>
            </div>
          </div>
        );
      case "lucro_bruto":
        return <LucroBrutoDetails data={data} />;
      case "crescimento_mom":
        return <VendasComprasOverlayDetails data={data} />;
      case "promissorias_pendentes":
        return (
          <PromissoriasList
            title="Promissórias pendentes"
            monthLabel={monthLabel}
            monthStr={monthStr}
            status="pending"
            expectedCount={data.promissorias?.mesAtual?.pendentes?.count ?? 0}
            expectedAmount={data.promissorias?.mesAtual?.pendentes?.valor ?? 0}
            onSelect={onSelect}
          />
        );
      case "promissorias_atrasadas":
        return (
          <PromissoriasList
            title="Promissórias atrasadas"
            monthLabel={monthLabel}
            monthStr={monthStr}
            status="late"
            expectedCount={data.promissorias?.mesAtual?.atrasados?.count ?? 0}
            expectedAmount={data.promissorias?.mesAtual?.atrasados?.valor ?? 0}
            onSelect={onSelect}
          />
        );
      case "proximo_mes":
        return (
          <PromissoriasList
            title="Promissórias que irão para o próximo mês"
            monthLabel={monthLabel}
            monthStr={monthStr}
            status="next"
            expectedCount={data.promissorias?.proximoMes?.pendentes?.count ?? 0}
            expectedAmount={data.promissorias?.proximoMes?.pendentes?.valor ?? 0}
            onSelect={onSelect}
          />
        );
      case "carry_over":
        return (
          <PromissoriasList
            title="Promissórias vindas de meses anteriores"
            monthLabel={monthLabel}
            monthStr={monthStr}
            status="carry"
            expectedCount={data.promissorias?.deMesesAnteriores?.emAberto?.count ?? 0}
            expectedAmount={data.promissorias?.deMesesAnteriores?.emAberto?.valor ?? 0}
            onSelect={onSelect}
          />
        );
      default:
        return <div className="text-sm">Sem detalhes.</div>;
    }
  })();

  return (
    <Modal title={t} onClose={onClose}>
      {content}
    </Modal>
  );
}

// ComprasHistoryChart
// Exibe série única de compras (valor mensal agregado) + tabela com MoM e delta absoluto.
// Espera um array: [{ month: 'YYYY-MM', compras: number, crescimento: number|null }]
function ComprasHistoryChart({ comprasHistory }) {
  if (!comprasHistory?.length) return null;
  const data = comprasHistory.map((r) => ({ label: r.month, value: r.compras }));
  return (
    <div className="mt-4">
      <h4 className="font-semibold mb-2">Histórico de Compras (12 meses)</h4>
      <LineAreaChart
        data={data}
        color="var(--color-warning)"
        height={180}
        formatValue={(v) => formatBRL(v)}
      />
      <div className="grid grid-cols-12 text-xs mt-2 font-medium text-gray-500 dark:text-gray-400">
        <div className="col-span-3">Mês</div>
        <div className="col-span-3 text-right">Compras</div>
        <div className="col-span-3 text-right">MoM %</div>
        <div className="col-span-3 text-right">Δ Absoluto</div>
      </div>
      {comprasHistory.map((r, i) => {
        const prev = i > 0 ? comprasHistory[i - 1].compras : null;
        const delta = prev != null ? r.compras - prev : null;
        return (
          <div key={r.month} className="grid grid-cols-12 text-xs py-0.5 border-b border-gray-100 dark:border-gray-800 last:border-none">
            <div className="col-span-3">{r.month}</div>
            <div className="col-span-3 text-right">{formatBRL(r.compras)}</div>
            <div className="col-span-3 text-right">{r.crescimento != null ? `${r.crescimento}%` : '-'}</div>
            <div className="col-span-3 text-right">{delta != null ? formatBRL(delta) : '-'}</div>
          </div>
        );
      })}
    </div>
  );
}

function PromissoriasList({
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
        const res = await fetch(
          `/api/v1/pedidos/promissorias?month=${encodeURIComponent(monthStr)}&status=${encodeURIComponent(status)}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Falha ao carregar lista");
        if (alive) setRows(Array.isArray(json) ? json : json?.data || []);
      } catch (e) {
        if (alive) setError(e.message || String(e));
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

// (Função PedidosListByMonth removida por não ser utilizada após refatoração)

// Row removido após adoção de layout gráfico para lucro bruto

// LucroBrutoDetails: mostra série histórica de lucro bruto, receita, margem e variações
// LucroBrutoDetails
// Deriva lucro bruto histórico a partir de growthHistory (vendas, cogs) já retornado pela API.
// Cada ponto: { label: 'YYYY-MM', value: lucroBruto, receita, cogs, margem }
function LucroBrutoDetails({ data }) {
  const history = Array.isArray(data.growthHistory) ? data.growthHistory : [];
  // Monta pontos com lucro bruto (vendas - cogs) e margem
  const chartData = history.map((h) => {
    const vendas = Number(h.vendas || 0);
    const cogs = Number(h.cogs || 0);
    const lucro = vendas - cogs;
    return {
      label: h.month,
      value: lucro,
      receita: vendas,
      cogs,
      margem: vendas > 0 ? (lucro / vendas) * 100 : 0,
    };
  });
  const [hovered, setHovered] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const firstVal = chartData.length ? chartData[0].value : 0;
  const fallbackPoint = chartData[chartData.length - 1] || null;
  const active = selected || hovered || fallbackPoint;
  const acumuladaPct =
    active && firstVal !== 0 ? ((active.value - firstVal) / firstVal) * 100 : 0;
  const prevPoint = active
    ? (() => {
      const idx = chartData.findIndex((p) => p.label === active.label);
      return idx > 0 ? chartData[idx - 1] : null;
    })()
    : null;
  const momPct =
    prevPoint && prevPoint.value !== 0
      ? ((active.value - prevPoint.value) / prevPoint.value) * 100
      : 0;
  function fmtMoney(n) {
    return Number(n || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-[360px]">
          <LineAreaChart
            data={chartData}
            showArea
            disableTooltip
            enableCrosshair
            onHover={(pt) => setHovered(pt)}
            onSelectPoint={(pt) =>
              setSelected((p) => (p && p.label === pt.label ? null : pt))
            }
            selectedLabel={selected?.label}
          />
        </div>
        <div className="w-full md:w-64 flex flex-col gap-3 text-xs border rounded p-3 bg-[var(--color-bg-secondary)]">
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">Mês</div>
            <div className="text-sm font-semibold">{active?.label || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">Lucro Bruto</div>
            <div className="text-sm font-semibold">{active ? fmtMoney(active.value) : "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">Receita</div>
            <div className="text-sm font-semibold">{active ? fmtMoney(active.receita) : "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">COGS</div>
            <div className="text-sm font-semibold">{active ? fmtMoney(active.cogs) : "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">Margem</div>
            <div className="text-sm font-semibold">
              {active ? `${active.margem.toFixed(1)}%` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">Var. Mês→Mês</div>
            <div
              className={`text-sm font-semibold ${!prevPoint ? "opacity-50" : momPct > 0 ? "text-green-500" : momPct < 0 ? "text-red-400" : ""}`}
            >
              {!prevPoint ? "—" : `${momPct > 0 ? "+" : ""}${momPct.toFixed(1)}%`}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">Var. Acumulada</div>
            <div
              className={`text-sm font-semibold ${acumuladaPct === 0 ? "opacity-70" : acumuladaPct > 0 ? "text-green-500" : "text-red-400"}`}
            >
              {active ? `${acumuladaPct > 0 ? "+" : ""}${acumuladaPct.toFixed(1)}%` : "—"}
            </div>
          </div>
          <div className="pt-2 border-t text-[11px] opacity-70 leading-snug">
            Lucro bruto = Receita - COGS (baseado em COGS reconhecido por mês).
            Clique para fixar um mês; clique novamente para soltar.
          </div>
        </div>
      </div>
      <div className="text-xs opacity-70">
        A série utiliza os mesmos meses de growthHistory. Margem calculada on-the-fly.
      </div>
    </div>
  );
}


// Novo painel overlay Vendas vs Compras com MoM de ambos
// VendasComprasOverlayDetails
// Painel consolidado comparando séries de Vendas (growthHistory) e Compras (comprasHistory)
// Inclui: MoM de cada série, diferença V-C, ratio (Compras/Vendas) e interação hover/select.
function VendasComprasOverlayDetails({ data }) {
  const historyV = Array.isArray(data.growthHistory) ? data.growthHistory : [];
  const historyC = Array.isArray(data.comprasHistory) ? data.comprasHistory : [];
  const seriesV = {
    label: "Vendas",
    color: "var(--color-accent)",
    data: historyV.map(h => ({ label: h.month, value: Number(h.vendas || 0), crescimento: h.crescimento }))
  };
  const seriesC = {
    label: "Compras",
    color: "#f59e0b",
    data: historyC.map(h => ({ label: h.month, value: Number(h.compras || 0), crescimento: h.crescimento }))
  };
  const [hovered, setHovered] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const composite = selected || hovered;
  function fmt(v) {
    return Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const diff = composite ? (Number(composite.a?.value || 0) - Number(composite.b?.value || 0)) : 0;
  const ratio = composite && Number(composite.a?.value) > 0 ? (Number(composite.b?.value || 0) / Number(composite.a?.value || 1)) * 100 : null;
  const prevLabel = (() => {
    if (!composite) return null;
    const idx = seriesV.data.findIndex(p => p.label === composite.label);
    if (idx > 0) return seriesV.data[idx - 1].label;
    return null;
  })();
  const prevV = prevLabel ? seriesV.data.find(p => p.label === prevLabel) : null;
  const prevC = prevLabel ? seriesC.data.find(p => p.label === prevLabel) : null;
  const momV = composite && prevV && prevV.value !== 0 ? ((composite.a?.value - prevV.value) / prevV.value) * 100 : null;
  const momC = composite && prevC && prevC.value !== 0 ? ((composite.b?.value - prevC.value) / prevC.value) * 100 : null;
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-[360px]">
          <DualLineChart
            seriesA={seriesV}
            seriesB={seriesC}
            onHoverPoint={pt => setHovered(pt)}
            onSelectPoint={pt => setSelected(p => (p && p.label === pt.label ? null : pt))}
            selectedLabel={selected?.label}
          />
        </div>
        <div className="w-full md:w-72 flex flex-col gap-3 text-xs border rounded p-3 bg-[var(--color-bg-secondary)]">
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">Mês</div>
            <div className="text-sm font-semibold">{composite?.label || "—"}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase opacity-60 tracking-wide">Vendas</div>
              <div className="text-sm font-semibold">{composite ? fmt(composite.a?.value) : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase opacity-60 tracking-wide">Compras</div>
              <div className="text-sm font-semibold">{composite ? fmt(composite.b?.value) : "—"}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase opacity-60 tracking-wide">MoM Vendas</div>
              <div className={`text-sm font-semibold ${momV == null ? 'opacity-50' : momV > 0 ? 'text-green-500' : momV < 0 ? 'text-red-400' : ''}`}>{momV == null ? '—' : `${momV > 0 ? '+' : ''}${momV.toFixed(1)}%`}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase opacity-60 tracking-wide">MoM Compras</div>
              <div className={`text-sm font-semibold ${momC == null ? 'opacity-50' : momC > 0 ? 'text-green-500' : momC < 0 ? 'text-red-400' : ''}`}>{momC == null ? '—' : `${momC > 0 ? '+' : ''}${momC.toFixed(1)}%`}</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">Diferença (V - C)</div>
            <div className={`text-sm font-semibold ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-400' : ''}`}>{composite ? fmt(diff) : '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">Compras / Vendas</div>
            <div className="text-sm font-semibold">{ratio == null ? '—' : `${ratio.toFixed(1)}%`}</div>
          </div>
          <div className="pt-2 border-t text-[11px] opacity-70 leading-snug">
            Sobrepõe séries mensais de receita (vendas) e compras. MoM calculado contra mês anterior.
          </div>
        </div>
      </div>
      <div className="text-xs opacity-70">Valores baseados em total_liquido + frete_total (vendas) e somatório equivalente para compras.</div>
    </div>
  );
}

function boundsFromYYYYMM(yyyyMM) {
  if (!/^\d{4}-\d{2}$/.test(String(yyyyMM || "")))
    return { from: null, to: null };
  const [y, m] = yyyyMM.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const next = new Date(y, m, 1);
  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  // 'to' inclusivo: dia anterior ao próximo mês
  const toDate = new Date(next.getTime() - 24 * 60 * 60 * 1000);
  return { from: ymd(start), to: ymd(toDate) };
}
