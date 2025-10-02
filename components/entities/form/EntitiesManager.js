import React, { useState, useEffect, useCallback } from "react";
import { MSG } from "components/common/messages";
import { useToast } from "components/entities/shared/toast";
import { Button } from "components/ui/Button";
import { EntitiesBrowser } from "../list/EntitiesBrowser";
import { EntityFormShell } from "./EntityFormShell";
import { useEntityFormController } from "./useEntityFormController";
import { useEntitySubmit } from "./useEntitySubmit";
import { useHighlightEntityLoad } from "hooks/useHighlightEntityLoad";

export function EntitiesManager({
  browserLimit = 20,
  highlightId: externalHighlightId,
}) {
  const [showForm, setShowForm] = useState(false);
  const { push } = useToast();
  const {
    form,
    editingId,
    isEditing,
    handleChange,
    handleBlurDocumento,
    initNew,
    loadForEdit,
    reset,
    derived: { isClient, documentIsCnpj, formatted },
  } = useEntityFormController();
  const { submit, submitting, error } = useEntitySubmit({ push });
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastEditedId, setLastEditedId] = useState(null);
  // push já obtido acima
  const handleEditRow = useCallback((row) => {
    loadForEdit(row);
    setShowForm(true);
  }, [loadForEdit]);

  // Novo: uso de hook genérico de highlight
  // Permitir uso automático via ?highlight= se prop não fornecida
  const derivedHighlightId = externalHighlightId != null ? externalHighlightId : (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('highlight') : null);

  const { highlighted, loadingHighlight, errorHighlight } = useHighlightEntityLoad({
    highlightId: derivedHighlightId,
    fetcher: async (id) => {
      const res = await fetch(`/api/v1/entities/${id}`);
      if (!res.ok) {
        let msg = MSG.GENERIC_ERROR;
        try { const j = await res.json(); msg = j?.error || msg; } catch (_) { /* noop */ }
        throw new Error(msg);
      }
      return res.json();
    },
  });

  // Ao carregar highlight com sucesso, abrir formulário em modo edição
  useEffect(() => {
    if (highlighted) {
      handleEditRow(highlighted);
      try {
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.delete('highlight');
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (_) { /* noop */ }
    }
  }, [highlighted, handleEditRow]);

  const toggleMode = () => {
    setShowForm((v) => {
      const next = !v;
      if (next && !isEditing) {
        initNew();
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await submit({ form, editingId });
    if (result.ok) {
      if (editingId) setLastEditedId(editingId);
      reset();
      setShowForm(false);
      setRefreshKey((k) => k + 1);
      push(editingId ? MSG.ENTITY_UPDATED : MSG.ENTITY_CREATED, { type: 'success' });
    }
  };


  // ESC para cancelar edição
  const escHandler = useCallback(
    (e) => {
      if (e.key === "Escape" && showForm) {
        e.preventDefault();
        setShowForm(false);
        reset();
      }
    },
    [showForm, reset],
  );
  useEffect(() => {
    window.addEventListener("keydown", escHandler);
    return () => window.removeEventListener("keydown", escHandler);
  }, [escHandler]);

  if (!showForm) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Cliente / Fornecedor</h2>
          <Button onClick={toggleMode} variant="primary" fullWidth={false}>
            Adicionar
          </Button>
        </div>
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
            {error}
          </div>
        )}
        <EntitiesBrowser
          key={refreshKey}
          limit={browserLimit}
          compact
          onEdit={handleEditRow}
          highlightId={externalHighlightId ?? lastEditedId}
        />
        {loadingHighlight && derivedHighlightId && (
          <div className="text-xs opacity-70">Carregando entidade #{derivedHighlightId}…</div>
        )}
        {errorHighlight && derivedHighlightId && (
          <div className="text-xs text-red-600">{errorHighlight}</div>
        )}
      </div>
    );
  }

  return (
    <EntityFormShell
      form={form}
      formatted={formatted}
      documentIsCnpj={documentIsCnpj}
      isClient={isClient}
      editingId={editingId}
      submitting={submitting}
      error={error}
      onSubmit={handleSubmit}
      onCancel={() => setShowForm(false)}
      onChange={handleChange}
      onBlurDocumento={handleBlurDocumento}
    />
  );
}
