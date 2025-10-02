import React from "react";
import { useToast } from "components/entities/shared";

// Hook que encapsula toda a lógica/estado do ProductForm.
// Mantém a mesma semântica original para suportar refatoração incremental.
// Responsabilidades:
//  - Inicializar campos básicos a partir de initial
//  - Buscar custos (custo médio / último custo) para cálculo de preço sugerido
//  - Calcular preço sugerido usando markup (fallback 30%)
//  - Calcular sugestão de estoque mínimo (consumo últimos 30 dias)
//  - Gerenciar fornecedores (lista de ids + labels) e modal
//  - Validar e submeter (delegando para onSubmit externo)
export function useProductFormLogic({ initial = {}, onSubmit }) {
  const { push } = useToast();

  const [nome, setNome] = React.useState(initial.nome || "");
  const [categoria, setCategoria] = React.useState(initial.categoria || "");
  const [codigoBarras, setCodigoBarras] = React.useState(initial.codigo_barras || "");
  const [ativo, setAtivo] = React.useState(initial.ativo ?? true);
  const [descricao, setDescricao] = React.useState(initial.descricao || "");
  const [precoTabela] = React.useState(
    initial.preco_tabela !== undefined && initial.preco_tabela !== null
      ? String(initial.preco_tabela)
      : "",
  );
  const [markupPercent] = React.useState(
    initial.markup_percent_default !== undefined &&
      initial.markup_percent_default !== null
      ? String(initial.markup_percent_default)
      : "",
  );
  const [estoqueMinimo] = React.useState(
    initial.estoque_minimo !== undefined && initial.estoque_minimo !== null
      ? String(initial.estoque_minimo)
      : "",
  );
  const [suppliers, setSuppliers] = React.useState(
    Array.isArray(initial.suppliers) ? initial.suppliers : [],
  );
  const [supplierLabels, setSupplierLabels] = React.useState(
    Array.isArray(initial.supplier_labels)
      ? initial.supplier_labels.map((s) => ({
        id: s.id,
        label: s.name || s.label || String(s.id),
      }))
      : [],
  );
  const [showSupplierModal, setShowSupplierModal] = React.useState(false);

  const [costInfo, setCostInfo] = React.useState({
    custo_medio: null,
    ultimo_custo: null,
  });
  const [suggestedPreco, setSuggestedPreco] = React.useState(null);
  const [suggestedOrigin, setSuggestedOrigin] = React.useState(null); // 'custo_medio' | 'ultimo_custo' | null
  const [estoqueHint, setEstoqueHint] = React.useState(null);

  // Buscar custo para cálculo de preço exibido (edição)
  React.useEffect(() => {
    const id = initial?.id;
    if (!Number.isFinite(Number(id))) return;
    let cancelled = false;
    fetch(`/api/v1/estoque/saldos?produto_id=${id}`, { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || cancelled) return;
        const cm = Number(data.custo_medio);
        const uc = Number(data.ultimo_custo);
        setCostInfo({ custo_medio: cm, ultimo_custo: uc });
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [initial?.id]);

  // Calcular sugestão de preço: custo × markup (fallback 30%)
  React.useEffect(() => {
    let md = Number(markupPercent);
    if (!Number.isFinite(md) || md <= 0) md = 30; // fallback visual
    const cm = Number(costInfo.custo_medio);
    const uc = Number(costInfo.ultimo_custo);
    const base =
      Number.isFinite(cm) && cm > 0
        ? (setSuggestedOrigin("custo_medio"), cm)
        : Number.isFinite(uc) && uc > 0
          ? (setSuggestedOrigin("ultimo_custo"), uc)
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
    let cancelled = false;
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const url = `/api/v1/estoque/movimentos?produto_id=${id}&tipo=SAIDA&from=${encodeURIComponent(from)}&limit=200`;
    fetch(url, { cache: "no-store" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !Array.isArray(data) || cancelled) return;
        const totalSaida = data.reduce(
          (acc, mv) => acc + (Number(mv.quantidade) || 0),
          0,
        );
        setEstoqueHint(Math.max(0, Math.ceil(totalSaida)));
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [initial?.id]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) {
      push("Nome é obrigatório", { type: "error" });
      return;
    }
    if (!suppliers.length) {
      push("Selecione ao menos um fornecedor (PJ)", { type: "error" });
      return;
    }
    onSubmit({
      nome: nome.trim(),
      categoria: categoria || null,
      codigo_barras: codigoBarras || null,
      ativo,
      descricao: descricao || null,
      suppliers,
    });
  }

  function addSupplier(it) {
    if (!it) return;
    setSuppliers((prev) => (prev.includes(it.id) ? prev : [...prev, it.id]));
    setSupplierLabels((prev) =>
      prev.find((x) => x.id === it.id)
        ? prev
        : [...prev, { id: it.id, label: it.label || it.name || String(it.id) }],
    );
  }

  function removeSupplier(id) {
    setSuppliers((prev) => prev.filter((s) => s !== id));
    setSupplierLabels((prev) => prev.filter((s) => s.id !== id));
  }

  function clearSuppliers() {
    setSuppliers([]);
    setSupplierLabels([]);
  }

  return {
    // state
    nome,
    categoria,
    codigoBarras,
    ativo,
    descricao,
    precoTabela,
    markupPercent,
    estoqueMinimo,
    suppliers,
    supplierLabels,
    showSupplierModal,
    costInfo,
    suggestedPreco,
    suggestedOrigin,
    estoqueHint,
    // setters & handlers
    setNome,
    setCategoria,
    setCodigoBarras,
    setAtivo,
    setDescricao,
    setShowSupplierModal,
    handleSubmit,
    addSupplier,
    removeSupplier,
    clearSuppliers,
  };
}

export default useProductFormLogic;
