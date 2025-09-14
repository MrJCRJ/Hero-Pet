import React from "react";
import { Button } from "./ui/Button";
import { FormContainer, FormField } from "./ui/Form";

export function PedidoForm() {
  return (
    <FormContainer title="Formulário de Pedido">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="ID do Cliente"
          name="clienteId"
          placeholder="ID do Cliente"
        />
        <FormField
          label="Produto"
          name="produto"
          placeholder="Produto"
        />
        <div className="md:col-span-2">
          <FormField
            label="Quantidade"
            name="quantidade"
            placeholder="Quantidade"
            type="number"
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
