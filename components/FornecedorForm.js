import React from "react";
import { Button } from "./ui/Button";
import { FormContainer, FormField } from "./ui/Form";

export function FornecedorForm({ form, setForm }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <FormContainer
      title="Formulário do Fornecedor"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="space-y-8">
        {/* Dados da Empresa */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">Dados da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Razão Social"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
            />
            <FormField
              label="CNPJ"
              name="cnpj"
              value={form.cnpj}
              onChange={handleChange}
              required
            />
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
              label="Telefone"
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              type="tel"
            />
            <FormField
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
            />
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
