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
    <FormContainer title="Formulário do Fornecedor">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Razão Social"
          name="nome"
          placeholder="Razão Social"
          value={form.nome}
          onChange={handleChange}
          required
        />
        <FormField
          label="CNPJ"
          name="cnpj"
          placeholder="CNPJ"
          value={form.cnpj}
          onChange={handleChange}
          required
        />
        <FormField
          label="Telefone"
          name="telefone"
          placeholder="Telefone"
          value={form.telefone}
          onChange={handleChange}
        />
        <FormField
          label="Email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        <FormField
          label="CEP"
          name="cep"
          placeholder="CEP"
          value={form.cep}
          onChange={handleChange}
        />
      </div>
      <div className="flex justify-end mt-8">
        <Button type="submit" variant="primary" size="sm" fullWidth={false}>
          Enviar
        </Button>
      </div>
    </FormContainer>
  );
}
