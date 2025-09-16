import React, { useState } from 'react';
import { Button } from '../ui/Button';
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
  getEntityLabel,
} from './index';
import { FormContainer } from '../ui/Form';

export function EntitiesManager({ browserLimit = 20 }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => createInitialEntityForm());

  const toggleMode = () => setShowForm((v) => !v);
  const handleChange = (e) => setForm((prev) => applyChange(prev, e.target));
  const handleBlurDocumento = () => setForm((prev) => applyDocumentBlur(prev));

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`${getEntityLabel(form.entityType)} cadastrado!\n` + JSON.stringify(form, null, 2));
    setForm(createInitialEntityForm());
    setShowForm(false);
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
        <EntitiesBrowser limit={browserLimit} compact />
      </div>
    );
  }

  return (
    <FormContainer title={`Formulário de Cliente / Fornecedor`} onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold">Novo {isClient ? 'Cliente' : 'Fornecedor'}</h2>
          <Button onClick={toggleMode} variant="secondary" fullWidth={false}>
            Voltar
          </Button>
        </div>
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
        <div className="flex justify-end pt-1">
          <Button type="submit" variant="primary" size="md" fullWidth={false} className="min-w-[120px]">
            Salvar
          </Button>
        </div>
      </div>
    </FormContainer>
  );
}
