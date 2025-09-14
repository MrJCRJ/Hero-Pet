import React from "react";

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
    <form className="mb-4 p-4 border rounded" onSubmit={handleSubmit}>
      <h2 className="font-bold mb-2">Formulário do Fornecedor</h2>
      <input
        className="border p-1 mb-2 w-full"
        placeholder="Nome da Empresa"
        name="nomeEmpresa"
        value={form.nomeEmpresa}
        onChange={handleChange}
      />
      <input
        className="border p-1 mb-2 w-full"
        placeholder="CNPJ"
        name="cnpj"
        value={form.cnpj}
        onChange={handleChange}
      />
      <button
        type="submit"
        className="bg-green-500 text-white px-4 py-1 rounded"
      >
        Enviar
      </button>
    </form>
  );
}
