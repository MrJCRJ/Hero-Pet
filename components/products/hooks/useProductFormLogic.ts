import React from "react";
import { useToast } from "components/entities/shared";

export interface ProductFormInitial {
  id?: number;
  nome?: string;
  categoria?: string | null;
  fabricante?: string | null;
  ativo?: boolean;
  descricao?: string | null;
  foto_url?: string | null;
  preco_tabela?: number | string | null;
  venda_granel?: boolean;
  preco_kg_granel?: number | string | null;
  estoque_kg?: number | string | null;
  custo_medio_kg?: number | string | null;
  suppliers?: number[];
  supplier_labels?: { id: number; name?: string; label?: string }[];
}

function numToInput(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v);
}

/* eslint-disable-next-line no-unused-vars -- nome do parâmetro documenta o contrato */
export type ProductFormSubmitHandler = (data: Record<string, unknown>) => Promise<void>;

export function useProductFormLogic({
  initial = {} as ProductFormInitial,
  onSubmit,
}: {
  initial?: ProductFormInitial;
  onSubmit: ProductFormSubmitHandler;
}) {
  const { push } = useToast();

  const [nome, setNome] = React.useState(initial.nome || "");
  const [categoria, setCategoria] = React.useState(initial.categoria || "");
  const [fabricante, setFabricante] = React.useState(initial.fabricante || "");
  const [descricao, setDescricao] = React.useState(initial.descricao || "");
  const [fotoUrl, setFotoUrl] = React.useState(initial.foto_url || "");
  const [precoTabela, setPrecoTabela] = React.useState(() =>
    numToInput(initial.preco_tabela),
  );
  const [vendaGranel, setVendaGranel] = React.useState(
    () => initial.venda_granel === true,
  );
  const [precoKgGranel, setPrecoKgGranel] = React.useState(() =>
    numToInput(initial.preco_kg_granel),
  );
  const [estoqueKg, setEstoqueKg] = React.useState(() =>
    numToInput(initial.estoque_kg),
  );
  const [custoMedioKg, setCustoMedioKg] = React.useState(() =>
    numToInput(initial.custo_medio_kg),
  );
  const [ativo, setAtivo] = React.useState(initial.ativo !== false);

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

  const isEditing = initial.id != null;

  function parseOptionalNumber(raw: string): number | null {
    const t = raw.trim().replace(/\s/g, "").replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      push("Nome é obrigatório", { type: "error" });
      return;
    }
    if (!suppliers.length) {
      push("Selecione ao menos um fornecedor (PJ)", { type: "error" });
      return;
    }
    const payload: Record<string, unknown> = {
      nome: nome.trim(),
      categoria: categoria || null,
      fabricante: fabricante || null,
      descricao: descricao || null,
      foto_url: fotoUrl || null,
      preco_tabela: parseOptionalNumber(precoTabela),
      ativo,
      venda_granel: vendaGranel,
      preco_kg_granel: parseOptionalNumber(precoKgGranel),
      estoque_kg: parseOptionalNumber(estoqueKg) ?? 0,
      custo_medio_kg: parseOptionalNumber(custoMedioKg) ?? 0,
      suppliers,
    };
    if (isEditing) {
      delete payload.estoque_kg;
      delete payload.custo_medio_kg;
    }
    onSubmit(payload);
  }

  function addSupplier(it: { id: number; label?: string; name?: string }) {
    if (!it) return;
    setSuppliers((prev) => (prev.includes(it.id) ? prev : [...prev, it.id]));
    setSupplierLabels((prev) =>
      prev.find((x) => x.id === it.id)
        ? prev
        : [...prev, { id: it.id, label: it.label || it.name || String(it.id) }],
    );
  }

  function removeSupplier(id: number) {
    setSuppliers((prev) => prev.filter((s) => s !== id));
    setSupplierLabels((prev) => prev.filter((s) => s.id !== id));
  }

  function clearSuppliers() {
    setSuppliers([]);
    setSupplierLabels([]);
  }

  return {
    isEditing,
    nome,
    categoria,
    fabricante,
    descricao,
    fotoUrl,
    precoTabela,
    vendaGranel,
    precoKgGranel,
    estoqueKg,
    custoMedioKg,
    ativo,
    suppliers,
    supplierLabels,
    showSupplierModal,
    setNome,
    setCategoria,
    setFabricante,
    setDescricao,
    setFotoUrl,
    setPrecoTabela,
    setVendaGranel,
    setPrecoKgGranel,
    setEstoqueKg,
    setCustoMedioKg,
    setAtivo,
    setShowSupplierModal,
    handleSubmit,
    addSupplier,
    removeSupplier,
    clearSuppliers,
  };
}

export default useProductFormLogic;
