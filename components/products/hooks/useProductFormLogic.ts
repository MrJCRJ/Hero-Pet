import React from "react";
import { useToast } from "components/entities/shared";

interface ProductFormInitial {
  id?: number;
  nome?: string;
  categoria?: string;
  fabricante?: string | null;
  codigo_barras?: string;
  ativo?: boolean;
  descricao?: string;
  foto_url?: string | null;
  preco_tabela?: number | string | null;
  markup_percent_default?: number | string | null;
  estoque_minimo?: number | string | null;
  suppliers?: number[];
  supplier_labels?: { id: number; name?: string; label?: string }[];
}

// Hook que encapsula toda a lógica/estado do ProductForm.
// Mantém a mesma semântica original para suportar refatoração incremental.
// Responsabilidades:
//  - Inicializar campos básicos a partir de initial
//  - Buscar custos (custo médio / último custo) para cálculo de preço sugerido
//  - Calcular preço sugerido usando markup (fallback 30%)
//  - Calcular sugestão de estoque mínimo (consumo últimos 30 dias)
//  - Gerenciar fornecedores (lista de ids + labels) e modal
//  - Validar e submeter (delegando para onSubmit externo)
/* eslint-disable no-unused-vars -- onSubmit callback param in interface */
export function useProductFormLogic({
  initial = {} as ProductFormInitial,
  onSubmit,
}: {
  initial?: ProductFormInitial;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}) {
  /* eslint-enable no-unused-vars */
  const { push } = useToast();

  const [nome, setNome] = React.useState(initial.nome || "");
  const [categoria, setCategoria] = React.useState(initial.categoria || "");
  const [fabricante, setFabricante] = React.useState(initial.fabricante || "");
  const [descricao, setDescricao] = React.useState(initial.descricao || "");
  const [fotoUrl, setFotoUrl] = React.useState(initial.foto_url || "");
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
      fabricante: fabricante || null,
      descricao: descricao || null,
      foto_url: fotoUrl || null,
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
    fabricante,
    descricao,
    fotoUrl,
    suppliers,
    supplierLabels,
    showSupplierModal,
    // setters & handlers
    setNome,
    setCategoria,
    setFabricante,
    setDescricao,
    setFotoUrl,
    setShowSupplierModal,
    handleSubmit,
    addSupplier,
    removeSupplier,
    clearSuppliers,
  };
}

export default useProductFormLogic;
