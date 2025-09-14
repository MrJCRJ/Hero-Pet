import React from "react";

export function PedidoForm() {
  return (
    <form className="mb-4 p-4 border rounded">
      <h2 className="font-bold mb-2">Formulário de Pedido</h2>
      <input className="border p-1 mb-2 w-full" placeholder="ID do Cliente" />
      <input className="border p-1 mb-2 w-full" placeholder="Produto" />
      <input
        className="border p-1 mb-2 w-full"
        placeholder="Quantidade"
        type="number"
      />
      <button
        type="submit"
        className="bg-purple-500 text-white px-4 py-1 rounded"
      >
        Enviar
      </button>
    </form>
  );
}
