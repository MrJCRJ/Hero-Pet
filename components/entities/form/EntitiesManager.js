import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "components/entities/shared/toast";
import { Button } from "components/ui/Button";
import { EntitiesBrowser } from "../list/EntitiesBrowser";
import {
  EntityTypeSelector,
  DocumentSection,
  AddressSection,
  ContactSection,
  StatusToggle,
  applyChange,
  applyDocumentBlur,
  computeDerived,
  createInitialEntityForm,
} from "./index";
import { FormContainer } from "components/ui/Form";

export function EntitiesManager({ browserLimit = 20 }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => createInitialEntityForm());
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastEditedId, setLastEditedId] = useState(null);
  const { push } = useToast();

  const toggleMode = () => {
    setShowForm((v) => {
      const next = !v;
      if (next) {
        // Abrindo form para novo cadastro: garantir reset se não estiver editando
        if (!editingId) {
          setForm(createInitialEntityForm());
        }
      }
      return next;
    });
  };
  const handleChange = (e) => setForm((prev) => applyChange(prev, e.target));
  const handleBlurDocumento = () => setForm((prev) => applyDocumentBlur(prev));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.nome.trim(),
        entity_type: form.entityType === "client" ? "PF" : "PJ",
        document_digits: form.documento,
        document_pending: form.documento_pendente,
        cep: form.cep || undefined,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        ativo: form.ativo,
      };
      let url = editingId
        ? `/api/v1/entities/${editingId}`
        : "/api/v1/entities";
      if (typeof window === 'undefined') {
        // ambiente de teste server-side (precaução) - usar localhost
        if (url.startsWith('/')) url = `http://localhost:3000${url}`;
      } else if (url.startsWith('/')) {
        // jsdom fetch wrapper já ajusta, mas garantimos
        url = `${url}`;
      }
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          throw new Error(
            data.error || "Já existe uma entidade com este documento.",
          );
        }
        throw new Error(
          data.error ||
          `Falha ao ${editingId ? "atualizar" : "salvar"} (status ${res.status})`,
        );
      }
      // Sucesso: registrar highlight antes de limpar editingId
      if (editingId) setLastEditedId(editingId);
      setEditingId(null);
      setForm(createInitialEntityForm());
      setShowForm(false);
      setRefreshKey((k) => k + 1);
      push(
        editingId
          ? "Registro atualizado com sucesso!"
          : "Registro salvo com sucesso!",
      );
    } catch (err) {
      setError(err.message);
      push(err.message, { type: "error", timeout: 5000 });
    } finally {
      setSubmitting(false);
    }
  };
  const { isClient, documentIsCnpj, formatted } = computeDerived(form);

  function handleEditRow(row) {
    // Preenche estado do formulário a partir da linha da tabela
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
      ativo: row.ativo !== false, // default true
    });
    setEditingId(row.id);
    setShowForm(true);
  }

  // ESC para cancelar edição
  const escHandler = useCallback((e) => {
    if (e.key === "Escape" && showForm) {
      e.preventDefault();
      setShowForm(false);
      setEditingId(null);
    }
  }, [showForm]);
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
          highlightId={lastEditedId}
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
