import React from "react";
import Link from "next/link";
import { Button } from "components/ui/Button";
import { SelectionModal } from "components/common/SelectionModal";
import { formatBRL, formatQtyBR } from "components/common/format";
import useProductFormLogic, {
  type ProductFormInitial,
  type ProductFormSubmitHandler,
} from "./hooks/useProductFormLogic";
import ProductFormSuppliersSection from "./ProductFormSuppliersSection";

const inputClass =
  "w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] pt-1 border-t border-[var(--color-border)] first:border-t-0 first:pt-0 mt-1 first:mt-0">
      {children}
    </p>
  );
}

type ResumoLinha = {
  custo_medio: number | null;
  preco_tabela: number | null;
  preco_medio_venda: number | null;
  saldo: number;
  minimo_efetivo: number | null;
  min_hint: number | null;
};

function precoVendaExibicao(
  precoTabela: number | null | undefined,
  custoMedio: number | null | undefined,
): string {
  const pv = precoTabela;
  const cm = custoMedio;
  if (pv != null && Number.isFinite(pv) && pv >= 0) return formatBRL(pv);
  if (cm != null && Number.isFinite(cm) && cm > 0)
    return formatBRL(cm * 1.2);
  return "—";
}

export function ProductForm({
  initial = {} as ProductFormInitial,
  onSubmit,
  submitting,
}: {
  initial?: ProductFormInitial;
  onSubmit: ProductFormSubmitHandler;
  submitting?: boolean;
}) {
  const logic = useProductFormLogic({ initial, onSubmit });
  const [categorias, setCategorias] = React.useState<string[]>([]);
  const [fabricantes, setFabricantes] = React.useState<string[]>([]);
  const [resumo, setResumo] = React.useState<ResumoLinha | null>(null);

  React.useEffect(() => {
    fetch("/api/v1/produtos/categorias", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => (Array.isArray(arr) ? arr : []))
      .then(setCategorias)
      .catch(() => setCategorias([]));
    fetch("/api/v1/produtos/fabricantes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => (Array.isArray(arr) ? arr : []))
      .then(setFabricantes)
      .catch(() => setFabricantes([]));
  }, []);

  const isEditing = initial.id != null;
  React.useEffect(() => {
    if (!isEditing || initial.id == null) {
      setResumo(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/v1/estoque/resumo?produto_id=${initial.id}&limit=1`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (cancelled) return;
        const arr = Array.isArray(rows) ? rows : [];
        const row = arr[0] as Record<string, unknown> | undefined;
        if (!row) {
          setResumo(null);
          return;
        }
        setResumo({
          custo_medio:
            row.custo_medio != null ? Number(row.custo_medio) : null,
          preco_tabela:
            row.preco_tabela != null ? Number(row.preco_tabela) : null,
          preco_medio_venda:
            row.preco_medio_venda != null
              ? Number(row.preco_medio_venda)
              : null,
          saldo: Number(row.saldo ?? 0),
          minimo_efetivo:
            row.minimo_efetivo != null ? Number(row.minimo_efetivo) : null,
          min_hint: row.min_hint != null ? Number(row.min_hint) : null,
        });
      })
      .catch(() => {
        if (!cancelled) setResumo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isEditing, initial.id]);

  const {
    nome,
    setNome,
    categoria,
    setCategoria,
    fabricante,
    setFabricante,
    descricao,
    setDescricao,
    fotoUrl,
    setFotoUrl,
    precoTabela,
    setPrecoTabela,
    vendaGranel,
    setVendaGranel,
    precoKgGranel,
    setPrecoKgGranel,
    estoqueKg,
    setEstoqueKg,
    custoMedioKg,
    setCustoMedioKg,
    ativo,
    setAtivo,
    supplierLabels,
    suppliers,
    showSupplierModal,
    setShowSupplierModal,
    handleSubmit,
    removeSupplier,
    clearSuppliers,
    addSupplier,
  } = logic;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 pr-1"
    >
      <div className="grid grid-cols-1 gap-3">
        <SectionTitle>Identificação</SectionTitle>
        <label className="text-sm">
          <span className="block mb-1">Link da foto</span>
          <input
            type="url"
            className={inputClass}
            placeholder="https://..."
            value={fotoUrl}
            onChange={(e) => setFotoUrl(e.target.value)}
          />
          {fotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoUrl}
              alt="Preview"
              className="mt-2 h-20 w-20 object-cover rounded border border-[var(--color-border)]"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </label>
        <label className="text-sm">
          <span className="block mb-1">Nome *</span>
          <input
            className={inputClass}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">Categoria</span>
          <input
            list="categorias-list"
            className={inputClass}
            placeholder="Digite ou selecione uma categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <datalist id="categorias-list">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="text-sm">
          <span className="block mb-1">Fabricante</span>
          <input
            list="fabricantes-list"
            className={inputClass}
            placeholder="Digite ou selecione o fabricante"
            value={fabricante}
            onChange={(e) => setFabricante(e.target.value)}
          />
          <datalist id="fabricantes-list">
            {fabricantes.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
        <ProductFormSuppliersSection
          suppliers={suppliers}
          supplierLabels={supplierLabels}
          setShowSupplierModal={setShowSupplierModal}
          clearSuppliers={clearSuppliers}
          removeSupplier={removeSupplier}
        />
        <label className="text-sm">
          <span className="block mb-1">Descrição</span>
          <textarea
            className={inputClass}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
          />
        </label>

        <SectionTitle>Comercial</SectionTitle>
        <label className="text-sm">
          <span className="block mb-1">
            Preço de venda (por embalagem / unidade) (R$)
          </span>
          <input
            inputMode="decimal"
            className={inputClass}
            value={precoTabela}
            onChange={(e) => setPrecoTabela(e.target.value)}
            placeholder="0,00"
          />
          <span className="block mt-1 text-xs text-[var(--color-text-secondary)]">
            Valor cobrado pela unidade vendida (ex.: saco, pacote).
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          <span>Ativo</span>
        </label>

        <SectionTitle>Granel</SectionTitle>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={vendaGranel}
            onChange={(e) => setVendaGranel(e.target.checked)}
          />
          <span>Vende também a granel (por kg)</span>
        </label>
        {vendaGranel && (
          <label className="text-sm">
            <span className="block mb-1">Preço de venda a granel (R$/kg)</span>
            <input
              inputMode="decimal"
              className={inputClass}
              value={precoKgGranel}
              onChange={(e) => setPrecoKgGranel(e.target.value)}
              placeholder="0,00"
            />
          </label>
        )}

        <SectionTitle>Situação do estoque</SectionTitle>
        {isEditing ? (
          <>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Valores alinhados à aba Estoque (movimentações e pedidos). O mínimo
              sugerido usa o consumo dos últimos 30 dias.
            </p>
            <Link
              href="/produtos?tab=estoque"
              className="inline-block text-sm text-[var(--color-accent)] underline underline-offset-2 hover:opacity-90"
            >
              Abrir aba Estoque
            </Link>
            <div className="overflow-x-auto rounded-md border border-[var(--color-border)] text-sm">
              <table className="w-full min-w-[520px] text-left">
                <thead className="bg-[var(--color-bg-secondary)] text-xs uppercase text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Produto</th>
                    <th className="px-2 py-2 font-semibold">Categoria</th>
                    <th className="px-2 py-2 text-right font-semibold">
                      Preço compra
                    </th>
                    <th className="px-2 py-2 text-right font-semibold">
                      Preço venda
                    </th>
                    <th className="px-2 py-2 text-right font-semibold">
                      P. médio venda
                    </th>
                    <th className="px-2 py-2 text-right font-semibold">
                      Saldo atual
                    </th>
                    <th className="px-2 py-2 text-right font-semibold">
                      Mínimo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[var(--color-border)]">
                    <td className="px-2 py-2 font-medium">{nome}</td>
                    <td className="px-2 py-2 text-[var(--color-text-secondary)]">
                      {categoria || "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {resumo?.custo_medio != null &&
                      Number.isFinite(resumo.custo_medio)
                        ? formatBRL(resumo.custo_medio)
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {precoVendaExibicao(
                        resumo?.preco_tabela ?? null,
                        resumo?.custo_medio ?? null,
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {resumo?.preco_medio_venda != null &&
                      Number.isFinite(resumo.preco_medio_venda)
                        ? formatBRL(resumo.preco_medio_venda)
                        : "—"}
                    </td>
                    <td className="px-2 py-2 text-right font-medium">
                      {resumo != null ? formatQtyBR(resumo.saldo) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {(() => {
                        const min =
                          resumo?.minimo_efetivo ?? resumo?.min_hint ?? null;
                        if (min != null && Number.isFinite(min)) {
                          return (
                            <span title="Sugerido (consumo 30 dias)">
                              {formatQtyBR(min)}
                              <span className="text-[10px] opacity-60 ml-1">
                                (30d)
                              </span>
                            </span>
                          );
                        }
                        return "—";
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Opcional: valores iniciais ao cadastrar o produto. Depois, o
              sistema passa a usar movimentações de estoque.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block mb-1">Saldo inicial (kg)</span>
                <input
                  inputMode="decimal"
                  className={inputClass}
                  value={estoqueKg}
                  onChange={(e) => setEstoqueKg(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1">Custo médio inicial (R$/kg)</span>
                <input
                  inputMode="decimal"
                  className={inputClass}
                  value={custoMedioKg}
                  onChange={(e) => setCustoMedioKg(e.target.value)}
                />
              </label>
            </div>
          </>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" loading={submitting} fullWidth={false}>
          Salvar
        </Button>
      </div>
      {showSupplierModal && (
        <SelectionModal<{ id: number; label: string; name: string }>
          title="Selecionar Fornecedor (PJ)"
          fetcher={async (q) => {
            const url = `/api/v1/entities?q=${encodeURIComponent(q)}&ativo=true&entity_type=PJ`;
            const res = await fetch(url, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok)
              throw new Error(data?.error || "Falha na busca de fornecedores");
            return data.map((e: { id: number; name: string; entity_type: string }) => ({
              id: e.id,
              label: `${e.name} • ${e.entity_type}`,
              name: e.name,
            }));
          }}
          extractLabel={(it) => it.label}
          onSelect={(it) => {
            setShowSupplierModal(false);
            addSupplier(it);
          }}
          onClose={() => setShowSupplierModal(false)}
          emptyMessage="Nenhum fornecedor encontrado"
          footer={null}
        />
      )}
    </form>
  );
}
