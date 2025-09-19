import React, { useState } from "react";
import { Button } from "components/ui/Button";

export function ProductForm({ initial = {}, onSubmit, submitting }) {
  const [nome, setNome] = useState(initial.nome || "");
  const [categoria, setCategoria] = useState(initial.categoria || "");
  const [codigoBarras, setCodigoBarras] = useState(initial.codigo_barras || "");
  const [ativo, setAtivo] = useState(initial.ativo ?? true);
  const [descricao, setDescricao] = useState(initial.descricao || "");
  const [precoTabela, setPrecoTabela] = useState(
    initial.preco_tabela !== undefined && initial.preco_tabela !== null ? String(initial.preco_tabela) : ""
  );
  const [markupPercent, setMarkupPercent] = useState(
    initial.markup_percent_default !== undefined && initial.markup_percent_default !== null
      ? String(initial.markup_percent_default)
      : ""
  );
  const [estoqueMinimo, setEstoqueMinimo] = useState(
    initial.estoque_minimo !== undefined && initial.estoque_minimo !== null ? String(initial.estoque_minimo) : ""
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) return alert("Nome é obrigatório");
    onSubmit({
      nome: nome.trim(),
      categoria: categoria || null,
      codigo_barras: codigoBarras || null,
      ativo,
      descricao: descricao || null,
      preco_tabela: precoTabela === "" ? null : Number(precoTabela),
      markup_percent_default: markupPercent === "" ? null : Number(markupPercent),
      estoque_minimo: estoqueMinimo === "" ? null : Number(estoqueMinimo),
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
          <label className="text-sm">
            <span className="block mb-1">Preço Tabela</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              value={precoTabela}
              onChange={(e) => setPrecoTabela(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1">Markup % (default)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1">Estoque mínimo</span>
            <input
              type="number"
              step="1"
              min="0"
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
            />
          </label>
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
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo
        </label>
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
    </form>
  );
}
