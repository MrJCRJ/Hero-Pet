import React from 'react';
import { formatBRL } from 'components/common/format';

// Componente isolado para ranking de produtos por lucro.
// Props:
//  - data: objeto retornado de /api/v1/produtos/top (top, history, meta)
//  - onNavigate(produto_id) => opcional; se não passado dispara evento global navigate:produtos
//  - showHistory: boolean para exibir matriz de lucro mensal
export function TopProdutosRanking({ data, onNavigate, showHistory = true }) {
  const rows = Array.isArray(data?.top) ? data.top : [];
  const history = Array.isArray(data?.history) ? data.history : [];
  if (!rows.length) return <div className="text-sm opacity-70">Sem dados de ranking.</div>;
  const limitUsed = data?.meta?.topNUsed || rows.length;
  const months = showHistory ? buildMonths(history) : [];
  const histMap = buildHistoryMap(history);

  function handleClick(id) {
    if (onNavigate) return onNavigate(id);
    try {
      window.dispatchEvent(new CustomEvent('navigate:produtos', { detail: { q: `#${id}` } }));
    } catch (_) { /* noop */ }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Top produtos por lucro (limite {limitUsed})</h3>
        <div className="text-[11px] opacity-60">Margens baseadas em COGS reconhecido</div>
      </div>
      <div className="border rounded overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[var(--color-bg-secondary)]">
            <tr>
              <th className="text-left px-2 py-1">Produto</th>
              <th className="text-right px-2 py-1">Receita</th>
              <th className="text-right px-2 py-1">COGS</th>
              <th className="text-right px-2 py-1">Lucro</th>
              <th className="text-right px-2 py-1">Margem</th>
              <th className="text-right px-2 py-1">Qtd</th>
              <th className="text-right px-2 py-1">Lucro Unit.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.produto_id} className="border-t last:border-b-0 hover:bg-[var(--color-bg-secondary)] cursor-pointer" onClick={() => handleClick(r.produto_id)} title="Filtrar lista pelo ID do produto">
                <td className="px-2 py-1" title={r.nome}>{truncate(r.nome, 48)}</td>
                <td className="px-2 py-1 text-right">{formatBRL(r.receita)}</td>
                <td className="px-2 py-1 text-right">{formatBRL(r.cogs)}</td>
                <td className="px-2 py-1 text-right font-medium">{formatBRL(r.lucro)}</td>
                <td className="px-2 py-1 text-right">{Number(r.margem || 0).toFixed(1)}%</td>
                <td className="px-2 py-1 text-right">{Number(r.quantidade || 0)}</td>
                <td className="px-2 py-1 text-right">{formatBRL(r.lucro_unitario)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showHistory && months.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Histórico mensal (lucro)</h4>
          <div className="overflow-auto border rounded">
            <table className="w-full text-[11px] min-w-[600px]">
              <thead className="bg-[var(--color-bg-secondary)]">
                <tr>
                  <th className="text-left px-2 py-1">Produto</th>
                  {months.map(m => <th key={m} className="text-right px-2 py-1">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.produto_id} className="border-t last:border-b-0 hover:bg-[var(--color-bg-secondary)]">
                    <td className="px-2 py-1" title={r.nome}>{truncate(r.nome, 40)}</td>
                    {months.map(mo => {
                      const pt = histMap.get(r.produto_id)?.find(x => x.month === mo);
                      const lucro = pt ? pt.lucro : 0;
                      const margem = pt ? pt.margem : 0;
                      return <td key={mo} className="px-2 py-1 text-right" title={pt ? `Margem ${margem}%` : 'Sem vendas'}>{lucro ? formatBRL(lucro) : '—'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] opacity-60 mt-2">Lucro por mês (— sem vendas). Tooltip mostra margem.</div>
        </div>
      )}
      <div className="text-[11px] opacity-60 leading-snug">
        Lucro = Receita - COGS. Margem% = Lucro / Receita. Lucro Unitário = Lucro / Qtd.
      </div>
    </div>
  );
}

function truncate(str, max) { if (!str) return ''; const s = String(str); return s.length > max ? s.slice(0, max - 1) + '…' : s; }
function buildMonths(history) {
  const set = new Set();
  history.forEach(h => h.history.forEach(pt => set.add(pt.month)));
  return Array.from(set).sort();
}
function buildHistoryMap(history) {
  const map = new Map();
  history.forEach(h => map.set(h.produto_id, h.history));
  return map;
}
