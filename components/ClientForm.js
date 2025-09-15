import React from "react";
import { Button } from "./ui/Button";
import { FormContainer, FormField } from "./ui/Form";

export function ClientForm({ form, setForm }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aqui você pode adicionar a lógica de envio para o backend
    alert("Cliente cadastrado!\n" + JSON.stringify(form, null, 2));
  };

  return (
    <FormContainer title="Formulário do Cliente">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Nome"
          name="nome"
          placeholder="Nome completo"
          value={form.nome}
          onChange={handleChange}
          required
        />
        <FormField
          label="Documento (CPF/CNPJ)"
          name="documento"
          placeholder="CPF ou CNPJ"
          value={form.documento}
          onChange={handleChange}
          required
        />
        <FormField
          label="CEP"
          name="cep"
          placeholder="CEP"
          value={form.cep}
          onChange={handleChange}
        />
        <FormField
          label="Número"
          name="numero"
          placeholder="Número do endereço"
          value={form.numero}
          onChange={handleChange}
        />
        <FormField
          label="Complemento"
          name="complemento"
          placeholder="Complemento (opcional)"
          value={form.complemento}
          onChange={handleChange}
        />
        <FormField
          label="Telefone"
          name="telefone"
          placeholder="Telefone"
          value={form.telefone}
          onChange={handleChange}
          type="tel"
        />
        <FormField
          label="Email"
          name="email"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={handleChange}
        />
        <div className="md:col-span-2 flex items-center gap-2 mt-4 mb-6">
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
      <div className="flex justify-end mt-8">
        <Button type="submit" variant="primary" size="sm" fullWidth={false}>
          Enviar
        </Button>
      </div>
    </FormContainer>
  );
}
