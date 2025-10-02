import { useCallback, useState } from "react";
import {
  createInitialEntityForm,
  applyChange,
  applyDocumentBlur,
  computeDerived,
} from "./index";

// Controla estado e edição do formulário de entidade (cliente/fornecedor)
export function useEntityFormController() {
  const [form, setForm] = useState(() => createInitialEntityForm());
  const [editingId, setEditingId] = useState(null);

  const reset = useCallback(() => {
    setForm(createInitialEntityForm());
    setEditingId(null);
  }, []);

  const initNew = useCallback(() => {
    setEditingId(null);
    setForm((prev) => ({
      ...createInitialEntityForm(),
      entityType: prev.entityType,
    }));
  }, []);

  const loadForEdit = useCallback((row) => {
    if (!row) return;
    setForm({
      entityType: row.entity_type === "PF" ? "client" : "supplier",
      nome: row.name || "",
      documento: row.document_digits || "",
      documento_pendente: row.document_pending,
      document_status: row.document_status || "pending",
      cep: row.cep || "",
      telefone: row.telefone || "",
      email: row.email || "",
      complemento: row.complemento || "",
      numero: row.numero || "",
      ativo: row.ativo !== false,
    });
    setEditingId(row.id);
  }, []);

  const handleChange = useCallback((e) => {
    setForm((prev) => applyChange(prev, e.target));
  }, []);

  const handleBlurDocumento = useCallback(() => {
    setForm((prev) => applyDocumentBlur(prev));
  }, []);

  const derived = computeDerived(form); // { isClient, documentIsCnpj, formatted }

  return {
    form,
    editingId,
    setEditingId,
    isEditing: !!editingId,
    handleChange,
    handleBlurDocumento,
    initNew,
    loadForEdit,
    reset,
    derived,
  };
}
