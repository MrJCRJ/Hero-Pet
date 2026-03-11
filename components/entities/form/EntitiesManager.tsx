import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { MSG } from "components/common/messages";
import { useToast } from "components/entities/shared/toast";
import { Button } from "components/ui/Button";
import { Modal } from "components/common/Modal";
import { PageSection } from "components/layout/PageSection";
import { EntitiesBrowser } from "../list/EntitiesBrowser";
import { EntityFormShell } from "./EntityFormShell";
import { useEntityFormController } from "./useEntityFormController";
import { useEntitySubmit } from "./useEntitySubmit";
import { useHighlightEntityLoad } from "hooks/useHighlightEntityLoad";

export function EntitiesManager({
  browserLimit = 20,
  highlightId: externalHighlightId = undefined,
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
  const handleEditRow = useCallback(
    (row) => {
      loadForEdit(row);
      setShowForm(true);
    },
    [loadForEdit],
  );

  const handleDuplicate = useCallback(
    async (row) => {
      const payload = {
        name: (row.name || "").trim() + " (cópia)",
        entity_type: row.entity_type || "PF",
        document_digits: "",
        document_pending: true,
        cep: row.cep || undefined,
        telefone: row.telefone || undefined,
        email: row.email || undefined,
        numero: row.numero || undefined,
        complemento: row.complemento || undefined,
        observacao: row.observacao || undefined,
        ativo: row.ativo !== false,
      };
      const res = await fetch("/api/v1/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Falha ao duplicar (${res.status})`);
      }
      const created = await res.json();
      setLastEditedId(created.id);
      setRefreshKey((k) => k + 1);
      loadForEdit(created);
      setShowForm(true);
      push("Entidade duplicada. Ajuste o documento e salve.", {
        type: "success",
        timeout: 4000,
      });
    },
    [loadForEdit, push],
  );

  // Novo: uso de hook genérico de highlight
  // Permitir uso automático via ?highlight= se prop não fornecida
  const searchParams = useSearchParams();
  const editFromUrl = searchParams?.get("edit");
  const derivedHighlightId =
    externalHighlightId != null
      ? externalHighlightId
      : editFromUrl || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("highlight") : null);

  const { highlighted, loadingHighlight, errorHighlight } =
    useHighlightEntityLoad({
      highlightId: derivedHighlightId,
      fetcher: async (id) => {
        const res = await fetch(`/api/v1/entities/${id}`);
        if (!res.ok) {
          let msg = MSG.GENERIC_ERROR;
          try {
            const j = await res.json();
            msg = j?.error || msg;
          } catch (_) {
            /* noop */
          }
          throw new Error(msg);
        }
        return res.json();
      },
    });

  // Ao carregar highlight/edit com sucesso, abrir formulário em modo edição
  useEffect(() => {
    if (highlighted) {
      handleEditRow(highlighted);
      try {
        if (typeof window !== "undefined" && window.history?.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.delete("highlight");
          url.searchParams.delete("edit");
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (_) {
        /* noop */
      }
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

  const [conflictEntityId, setConflictEntityId] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setConflictEntityId(null);
    const result = await submit({ form, editingId });
    if (result.ok) {
      if (editingId) setLastEditedId(editingId);
      reset();
      setShowForm(false);
      setRefreshKey((k) => k + 1);
      push(editingId ? MSG.ENTITY_UPDATED : MSG.ENTITY_CREATED, {
        type: "success",
      });
    } else if (result.existingEntityId) {
      setConflictEntityId(result.existingEntityId);
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

  const handleCloseModal = useCallback(() => {
    setShowForm(false);
    setConflictEntityId(null);
    reset();
    if (typeof window !== "undefined" && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      const qs = url.searchParams.toString();
      window.history.replaceState({}, document.title, url.pathname + (qs ? `?${qs}` : ""));
    }
  }, [reset]);

  return (
    <>
      <PageSection
        title="Clientes e Fornecedores"
        description="Gerencie clientes e fornecedores do sistema"
        actions={
          <Button onClick={toggleMode} variant="primary" fullWidth={false}>
            Adicionar
          </Button>
        }
      >
        {error && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2 py-1 rounded mb-4">
            {error}
          </div>
        )}
        <EntitiesBrowser
          key={refreshKey}
          limit={browserLimit}
          compact
          onEdit={handleEditRow}
          onDuplicate={handleDuplicate}
          highlightId={externalHighlightId ?? lastEditedId}
        />
        {loadingHighlight && derivedHighlightId && (
          <div className="text-xs opacity-70">
            Carregando entidade #{derivedHighlightId}…
          </div>
        )}
        {errorHighlight && derivedHighlightId && (
          <div className="text-xs text-red-600">{errorHighlight}</div>
        )}
      </PageSection>
      {showForm && (
        <Modal
          title={
            editingId
              ? `Editar ${form.entityType === "client" ? "Cliente" : "Fornecedor"}`
              : `Novo ${form.entityType === "client" ? "Cliente" : "Fornecedor"}`
          }
          onClose={handleCloseModal}
          maxWidth="max-w-2xl"
        >
          {editingId && (
            <div className="mb-4">
              <Link
                href={`/orders?partner=${editingId}&tipo=${form.entityType === "client" ? "VENDA" : "COMPRA"}`}
                className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)] hover:underline"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden />
                Criar pedido
              </Link>
            </div>
          )}
          <div className="max-h-[80vh] overflow-y-auto">
            <EntityFormShell
              form={form}
              formatted={formatted}
              documentIsCnpj={documentIsCnpj}
              isClient={isClient}
              editingId={editingId}
              submitting={submitting}
              error={error}
              conflictEntityId={conflictEntityId}
              onSubmit={handleSubmit}
              onCancel={handleCloseModal}
              onChange={handleChange}
              onBlurDocumento={handleBlurDocumento}
              embedded
            />
          </div>
        </Modal>
      )}
    </>
  );
}
