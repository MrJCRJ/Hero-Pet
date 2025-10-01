import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "components/entities/shared/toast";
import { Button } from "components/ui/Button";
import { EntitiesBrowser } from "../list/EntitiesBrowser";
import { EntityTypeSelector, DocumentSection, AddressSection, ContactSection, StatusToggle } from "./index";
import { FormContainer } from "components/ui/Form";
import { useEntityFormController } from "./useEntityFormController";
import { useEntitySubmit } from "./useEntitySubmit";

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
  // Quando highlightId externo for informado, abrir o formulário no modo edição
  useEffect(() => {
    async function openIfRequested() {
      if (!externalHighlightId) return;
      try {
        const res = await fetch(`/api/v1/entities/${externalHighlightId}`);
        if (!res.ok) return; // se não encontrar, ignora silenciosamente
        const row = await res.json();
        handleEditRow(row);
      } catch (_) {
        /* noop */
      }
    }
    openIfRequested();
    // executar quando highlight id mudar
  }, [externalHighlightId, handleEditRow]);

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
      push(
        editingId
          ? "Registro atualizado com sucesso!"
          : "Registro salvo com sucesso!",
      );
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
      </div>
    );
  }

  return (
    <FormContainer
      title={`Formulário de Cliente / Fornecedor`}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <h2 className="text-base font-semibold">
          {editingId
            ? `Editando ${isClient ? "Cliente" : "Fornecedor"}`
            : `Novo ${isClient ? "Cliente" : "Fornecedor"}`}
        </h2>
        <div className="card p-2 space-y-2">
          <EntityTypeSelector value={form.entityType} onChange={handleChange} />
          <DocumentSection
            form={formatted}
            isDocumentCnpj={documentIsCnpj}
            onChange={handleChange}
            onBlurDocumento={handleBlurDocumento}
          />
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          <div className="card p-1 space-y-2">
            <AddressSection form={formatted} onChange={handleChange} />
          </div>
          <div className="card p-1 space-y-2">
            <ContactSection form={formatted} onChange={handleChange} />
          </div>
          <div className="card p-1 space-y-2">
            <StatusToggle checked={form.ativo} onChange={handleChange} />
          </div>
        </div>
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
            {error}
          </div>
        )}
        <div className="flex justify-end pt-1 gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth={false}
            disabled={submitting}
            onClick={() => setShowForm(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth={false}
            className="min-w-[120px]"
            disabled={submitting}
            loading={submitting}
          >
            {submitting
              ? editingId
                ? "Atualizando..."
                : "Salvando..."
              : editingId
                ? "Atualizar"
                : "Salvar"}
          </Button>
        </div>
      </div>
    </FormContainer>
  );
}
