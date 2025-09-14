import React from "react";

export function SupplierForm() {
  return (
    <form className="mb-4 p-4 border rounded">
      <h2 className="font-bold mb-2">Formulário do Fornecedor</h2>
      <input className="border p-1 mb-2 w-full" placeholder="Nome da Empresa" />
      <input className="border p-1 mb-2 w-full" placeholder="CNPJ" />
      <button
        type="submit"
        className="bg-green-500 text-white px-4 py-1 rounded"
      >
        Enviar
      </button>
    </form>
  );
}
