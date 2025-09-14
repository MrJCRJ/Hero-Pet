import React, { useState } from "react";

export function ClientForm() {
  const [form, setForm] = useState({
    nome: "",
    documento: "",
    cep: "",
    numero: "",
    complemento: "",
    telefone: "",
    email: "",
    ativo: true,
  });
  const [step, setStep] = useState(1);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };


  const handleNext = (e) => {
    e.preventDefault();
    setStep((prev) => prev + 1);
  };

  const handleBack = (e) => {
    e.preventDefault();
    setStep((prev) => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aqui você pode adicionar a lógica de envio para o backend
    alert("Cliente cadastrado!\n" + JSON.stringify(form, null, 2));
  };

  return (
    <form
      onSubmit={step === 3 ? handleSubmit : handleNext}
      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-md p-6 max-w-lg mx-auto mt-4"
    >
      <h2 className="text-xl font-bold mb-4 text-[var(--color-accent)]">Formulário do Cliente</h2>
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--color-text-secondary)] mb-1 font-medium">Nome do Cliente</label>
            <input
              name="nome"
              placeholder="Nome do Cliente"
              value={form.nome}
              onChange={handleChange}
              required
              type="text"
              className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] bg-transparent text-[var(--color-text-primary)]"
            />
          </div>
          <div>
            <label className="block text-[var(--color-text-secondary)] mb-1 font-medium">CPF ou CNPJ</label>
            <input
              name="documento"
              placeholder="CPF ou CNPJ"
              value={form.documento}
              onChange={handleChange}
              required
              type="text"
              className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] bg-transparent text-[var(--color-text-primary)]"
            />
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--color-text-secondary)] mb-1 font-medium">CEP</label>
            <input
              name="cep"
              placeholder="CEP"
              value={form.cep}
              onChange={handleChange}
              type="text"
              className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] bg-transparent text-[var(--color-text-primary)]"
            />
          </div>
          <div>
            <label className="block text-[var(--color-text-secondary)] mb-1 font-medium">Número do Endereço</label>
            <input
              name="numero"
              placeholder="Número do Endereço"
              value={form.numero}
              onChange={handleChange}
              type="text"
              className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] bg-transparent text-[var(--color-text-primary)]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[var(--color-text-secondary)] mb-1 font-medium">Complemento (opcional)</label>
            <input
              name="complemento"
              placeholder="Complemento (opcional)"
              value={form.complemento}
              onChange={handleChange}
              type="text"
              className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] bg-transparent text-[var(--color-text-primary)]"
            />
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--color-text-secondary)] mb-1 font-medium">Telefone</label>
            <input
              name="telefone"
              placeholder="Telefone"
              value={form.telefone}
              onChange={handleChange}
              type="tel"
              className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] bg-transparent text-[var(--color-text-primary)]"
            />
          </div>
          <div>
            <label className="block text-[var(--color-text-secondary)] mb-1 font-medium">Email</label>
            <input
              name="email"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-accent)] bg-transparent text-[var(--color-text-primary)]"
            />
          </div>
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
      )}
      <div className="flex justify-between mt-8">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="bg-[var(--color-accent-cancel)] hover:bg-[var(--color-accent-cancel-hover)] text-white font-semibold py-2 px-6 rounded shadow transition-colors"
          >
            Voltar
          </button>
        )}
        {step < 3 && (
          <button
            type="submit"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold py-2 px-8 rounded shadow transition-colors ml-auto"
          >
            Próximo
          </button>
        )}
        {step === 3 && (
          <button
            type="submit"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold py-2 px-8 rounded shadow transition-colors ml-auto"
          >
            Enviar
          </button>
        )}
      </div>
    </form>
  );
}
