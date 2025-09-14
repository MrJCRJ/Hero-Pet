import React from "react";
import { Button } from "./ui/Button";
import { FormContainer, FormField } from "./ui/Form";

export function FornecedorForm({ form, setForm, step, setStep }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Fornecedor cadastrado!\n" + JSON.stringify(form, null, 2));
  };

  return (
    <FormContainer title="Formulário do Fornecedor">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Nome da Empresa"
          name="nomeEmpresa"
          placeholder="Nome da Empresa"
          value={form.nomeEmpresa}
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
      </div>
      <div className="flex justify-end mt-8">
        <Button type="submit" variant="primary" size="sm" fullWidth={false}>
          Enviar
        </Button>
      </div>
    </FormContainer>
  );

}
