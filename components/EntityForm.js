import React from "react";
import { Button } from "./ui/Button";
import { FormContainer, FormField } from "./ui/Form";

export function EntityForm({ form, setForm }) {
  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;

    // Se o campo for documento, limpa tudo que não for número
    let newValue = value;
    if (name === "documento") {
      newValue = value.replace(/\D/g, "").substring(0, 14); // Limita a 14 caracteres (CNPJ)
    }

    setForm((prev) => ({
      ...prev,
      [name]: inputType === "checkbox" ? checked : newValue,
    }));
  };

  // Detecta se é CPF ou CNPJ baseado no número de caracteres
  const isDocumentCnpj = form.documento && form.documento.length > 11;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aqui você pode adicionar a lógica de envio para o backend
    alert(`${form.entityType === "client" ? "Cliente" : "Fornecedor"} cadastrado!\n` + JSON.stringify(form, null, 2));
  };

  const isClient = form.entityType === "client";

  return (
    <FormContainer
      title={`Formulário de ${isClient ? "Cliente" : "Fornecedor"}`}
      onSubmit={handleSubmit}
    >
      <div className="space-y-8">
        {/* Tipo de Entidade */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Tipo de Entidade</h3>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                id="entityTypeClient"
                name="entityType"
                value="client"
                checked={form.entityType === "client"}
                onChange={handleChange}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
              <label
                htmlFor="entityTypeClient"
                className="text-[var(--color-text-secondary)] cursor-pointer"
              >
                Cliente
              </label>
            </div>
            <div className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                id="entityTypeSupplier"
                name="entityType"
                value="supplier"
                checked={form.entityType === "supplier"}
                onChange={handleChange}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
              <label
                htmlFor="entityTypeSupplier"
                className="text-[var(--color-text-secondary)] cursor-pointer"
              >
                Fornecedor
              </label>
            </div>
          </div>
        </div>

        {/* Dados Principais */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">
            {isDocumentCnpj ? "Dados da Empresa" : "Dados Pessoais"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label={isDocumentCnpj ? "Razão Social" : "Nome"}
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
            />
            <FormField
              label={isDocumentCnpj ? "CNPJ" : "CPF"}
              name="documento"
              value={form.documento}
              onChange={handleChange}
              required
              maxLength={isDocumentCnpj ? 14 : 11}
              pattern={isDocumentCnpj ? "[0-9]{14}" : "[0-9]{11}"}
              title={isDocumentCnpj ? "Digite os 14 números do CNPJ" : "Digite os 11 números do CPF"}></FormField>
          </div>
        </div>

        {/* Endereço */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Endereço</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="col-span-1">
              <FormField
                label="CEP"
                name="cep"
                value={form.cep}
                onChange={handleChange}
              />
            </div>
            <div className="col-span-1">
              <FormField
                label="Número"
                name="numero"
                value={form.numero}
                onChange={handleChange}
              />
            </div>
            <div className="col-span-2">
              <FormField
                label="Complemento"
                name="complemento"
                value={form.complemento}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Contato</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />
            <FormField
              label="Telefone"
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              type="tel"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Status</h3>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="ativo"
              checked={form.ativo}
              onChange={handleChange}
              className="w-4 h-4 accent-[var(--color-accent)] border-[var(--color-border)]"
            />
            <span className="text-[var(--color-text-secondary)]">Ativo</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <Button type="submit" variant="primary" size="sm" fullWidth={false}>
          Enviar
        </Button>
      </div>
    </FormContainer>
  );
}
