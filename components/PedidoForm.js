import React from "react";
import { Button } from "./ui/Button";
import { FormContainer, FormField } from "./ui/Form";

export function PedidoForm() {
  return (
    <FormContainer title="Formulário de Pedido">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          label="ID do Cliente"
          name="clienteId"
          required
        />
        <div className="md:col-span-2">
          <FormField
            label="Produto"
            name="produto"
            required
          />
        </div>
        <FormField
          label="Quantidade"
          name="quantidade"
          type="number"
          min="1"
          required
        />
        <div className="md:col-span-2">
          <FormField
            label="Observação"
            name="observacao"
          />
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
