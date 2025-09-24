import React, { useState } from "react";
import { Button } from "components/ui/Button";
import { SelectionModal } from "components/common/SelectionModal";

export function ProductForm({ initial = {}, onSubmit, submitting }) {
  const [nome, setNome] = useState(initial.nome || "");
  const [categoria, setCategoria] = useState(initial.categoria || "");
  const [codigoBarras, setCodigoBarras] = useState(initial.codigo_barras || "");
  const [ativo, setAtivo] = useState(initial.ativo ?? true);
  const [descricao, setDescricao] = useState(initial.descricao || "");
  const [precoTabela] = useState(
    initial.preco_tabela !== undefined && initial.preco_tabela !== null
      ? String(initial.preco_tabela)
      : "",
  );
  const [markupPercent] = useState(
    initial.markup_percent_default !== undefined &&
      initial.markup_percent_default !== null
      ? String(initial.markup_percent_default)
      : "",
  );
  const [estoqueMinimo] = useState(
    initial.estoque_minimo !== undefined && initial.estoque_minimo !== null
      ? String(initial.estoque_minimo)
      : "",
  );
  const [suppliers, setSuppliers] = useState(
    Array.isArray(initial.suppliers) ? initial.suppliers : [],
  );
  const [supplierLabels, setSupplierLabels] = useState(
    Array.isArray(initial.supplier_labels)
      ? initial.supplier_labels.map((s) => ({
        id: s.id,
        label: s.name || s.label || String(s.id),
      }))
      : [],
  );
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  // Campos visuais: exibir valores calculados quando ausentes
  const [costInfo, setCostInfo] = useState({
    custo_medio: null,
    ultimo_custo: null,
  });
  const [suggestedPreco, setSuggestedPreco] = useState(null);
  const [suggestedOrigin, setSuggestedOrigin] = useState(null); // 'custo_medio' | 'ultimo_custo' | null
  const [estoqueHint, setEstoqueHint] = useState(null);

  // Buscar custo para cálculo de preço exibido (edição)
  React.useEffect(() => {
    const id = initial?.id;
    if (!Number.isFinite(Number(id))) return;
    fetch(`/api/v1/estoque/saldos?produto_id=${id}`, { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) return;
        const cm = Number(data.custo_medio);
        const uc = Number(data.ultimo_custo);
        setCostInfo({ custo_medio: cm, ultimo_custo: uc });
      })
      .catch(() => { });
  }, [initial?.id]);

  // Calcular sugestão de preço: custo × markup (fallback 30%)
  React.useEffect(() => {
    let md = Number(markupPercent);
    if (!Number.isFinite(md) || md <= 0) md = 30; // fallback visual
    const cm = Number(costInfo.custo_medio);
    const uc = Number(costInfo.ultimo_custo);
    const base =
      Number.isFinite(cm) && cm > 0
        ? (setSuggestedOrigin('custo_medio'), cm)
        : Number.isFinite(uc) && uc > 0
          ? (setSuggestedOrigin('ultimo_custo'), uc)
          : (setSuggestedOrigin(null), null);
    if (base == null) {
      setSuggestedPreco(null);
      return;
    }
    setSuggestedPreco(Number((base * (1 + md / 100)).toFixed(2)));
  }, [markupPercent, costInfo]);

  // Calcular sugestão de estoque mínimo por consumo 30d (edição)
  React.useEffect(() => {
    const id = initial?.id;
    if (!Number.isFinite(Number(id))) return;
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const url = `/api/v1/estoque/movimentos?produto_id=${id}&tipo=SAIDA&from=${encodeURIComponent(from)}&limit=200`;
    fetch(url, { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !Array.isArray(data)) return;
        const totalSaida = data.reduce(
          (acc, mv) => acc + (Number(mv.quantidade) || 0),
          0,
        );
        setEstoqueHint(Math.max(0, Math.ceil(totalSaida)));
      })
      .catch(() => { });
  }, [initial?.id]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) return alert("Nome é obrigatório");
    if (!suppliers.length)
      return alert("Selecione ao menos um fornecedor (PJ)");
    onSubmit({
      nome: nome.trim(),
      categoria: categoria || null,
      codigo_barras: codigoBarras || null,
      ativo,
      descricao: descricao || null,
      // Campos calculados (visual-only): não enviar para criar/atualizar
      suppliers,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm">
          <span className="block mb-1">Nome *</span>
          <input
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">Categoria</span>
          <input
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="text-sm">
            <span className="block mb-1">Preço Tabela</span>
            <div
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              title="Exibimos o Preço Tabela cadastrado; se ausente, usamos custo médio/último custo × markup (fallback 30%). Os custos já incluem frete quando existente."
            >
              {precoTabela !== ""
                ? `R$ ${Number(precoTabela).toFixed(2)}`
                : suggestedPreco != null
                  ? (
                    <span>
                      {`R$ ${Number(suggestedPreco).toFixed(2)}`}
                      {suggestedOrigin && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(
                          {suggestedOrigin === 'custo_medio' ? 'base: custo médio' : 'base: último custo'}
                          )</span>
                      )}
                    </span>
                  )
                  : "–"}
            </div>
          </div>
          <div className="text-sm">
            <span className="block mb-1">Markup % (default)</span>
            <div
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              title="Markup padrão do produto; se ausente, exibimos 30% como padrão visual."
            >
              {markupPercent !== ""
                ? `${Number(markupPercent).toFixed(2)} %`
                : `30.00 %`}
            </div>
          </div>
          <div className="text-sm">
            <span className="block mb-1">Estoque mínimo</span>
            <div
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              title="Exibimos o Estoque mínimo cadastrado; se ausente, usamos sugestão por consumo (30 dias)."
            >
              {estoqueMinimo !== ""
                ? Number(estoqueMinimo).toFixed(0)
                : estoqueHint != null
                  ? Number(estoqueHint).toFixed(0)
                  : "–"}
            </div>
          </div>
        </div>
        <div className="text-xs opacity-70 mt-1">
          Campos calculados automaticamente (com base em custos e consumo quando
          aplicável)
        </div>
        <label className="text-sm">
          <span className="block mb-1">Código de Barras</span>
          <input
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            value={codigoBarras}
            onChange={(e) => setCodigoBarras(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          Ativo
        </label>
        <div className="text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="block">Fornecedores *</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                fullWidth={false}
                onClick={() => setShowSupplierModal(true)}
              >
                Adicionar fornecedor
              </Button>
              {suppliers.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onClick={() => {
                    setSuppliers([]);
                    setSupplierLabels([]);
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
          <div className="min-h-[38px] px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            {supplierLabels.length ? (
              <div className="flex flex-wrap gap-2">
                {supplierLabels.map((s) => (
                  <span
                    key={s.id}
                    className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)]"
                  >
                    {s.label}
                    <button
                      className="ml-2 opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.preventDefault();
                        setSuppliers((prev) =>
                          prev.filter((id) => id !== s.id),
                        );
                        setSupplierLabels((prev) =>
                          prev.filter((x) => x.id !== s.id),
                        );
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="opacity-60 text-xs">
                Nenhum fornecedor selecionado
              </span>
            )}
          </div>
        </div>
        <label className="text-sm">
          <span className="block mb-1">Descrição</span>
          <textarea
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" loading={submitting} fullWidth={false}>
          Salvar
        </Button>
      </div>
      {showSupplierModal && (
        <SelectionModal
          title="Selecionar Fornecedor (PJ)"
          fetcher={async (q) => {
            const url = `/api/v1/entities?q=${encodeURIComponent(q)}&ativo=true&entity_type=PJ`;
            const res = await fetch(url, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok)
              throw new Error(data?.error || "Falha na busca de fornecedores");
            return data.map((e) => ({
              id: e.id,
              label: `${e.name} • ${e.entity_type}`,
              name: e.name,
            }));
          }}
          extractLabel={(it) => it.label}
          onSelect={(it) => {
            setShowSupplierModal(false);
            if (it) {
              setSuppliers((prev) =>
                prev.includes(it.id) ? prev : [...prev, it.id],
              );
              setSupplierLabels((prev) =>
                prev.find((x) => x.id === it.id)
                  ? prev
                  : [...prev, { id: it.id, label: it.label }],
              );
            }
          }}
          onClose={() => setShowSupplierModal(false)}
        />
      )}
    </form>
  );
}
