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
    <FormContainer title="Formulário do Cliente" onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Nome"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            required
          />
          <FormField
            label="Documento (CPF/CNPJ)"
            name="documento"
            value={form.documento}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label="CEP"
            name="cep"
            value={form.cep}
            onChange={handleChange}
          />
          <FormField
            label="Número"
            name="numero"
            value={form.numero}
            onChange={handleChange}
          />
          <FormField
            label="Complemento"
            name="complemento"
            value={form.complemento}
            onChange={handleChange}
          />
        </div>

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

      <div className="flex justify-end mt-8">
        <Button type="submit" variant="primary" size="sm" fullWidth={false}>
          Enviar
        </Button>
      </div>
    </FormContainer>
  );
}
