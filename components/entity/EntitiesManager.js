import React, { useState } from "react";
import { useToast } from "../ui/ToastProvider";
import { Button } from "../ui/Button";
import {
  EntitiesBrowser,
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
import { FormContainer } from "../ui/Form";

export function EntitiesManager({ browserLimit = 20 }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => createInitialEntityForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // força remontar browser pós criação
  const { push } = useToast();

  const toggleMode = () => setShowForm((v) => !v);
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
      };
      const res = await fetch("/api/v1/entities", {
        method: "POST",
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
        throw new Error(data.error || `Falha ao salvar (status ${res.status})`);
      }
      // sucesso
      setForm(createInitialEntityForm());
      setShowForm(false);
      setRefreshKey((k) => k + 1);
      push("Registro salvo com sucesso!");
    } catch (err) {
      setError(err.message);
      push(err.message, { type: "error", timeout: 5000 });
    } finally {
      setSubmitting(false);
    }
  };
  const { isClient, documentIsCnpj, formatted } = computeDerived(form);

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
        <EntitiesBrowser key={refreshKey} limit={browserLimit} compact />
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
          Novo {isClient ? "Cliente" : "Fornecedor"}
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
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </FormContainer>
  );
}
