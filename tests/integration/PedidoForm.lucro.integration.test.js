/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { PedidoForm } from "components/PedidoForm";

// Teste simples: renderiza PedidoForm em modo edição com item contendo custo_fifo_unitario
// e valida exibição de Lucro e Lucro Total.

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("PedidoForm - Lucro (VENDA)", () => {
  test("renderiza coluna Lucro e calcula a partir de custo_fifo_unitario em pedido em edição", async () => {
    const editingOrder = {
      id: 999,
      tipo: "VENDA",
      fifo_aplicado: true,
      itens: [
        {
          produto_id: 10,
          produto_nome: "Produto Lucro",
          quantidade: 2,
          preco_unitario: 50.0,
          desconto_unitario: 5.0,
          custo_fifo_unitario: 30.0,
          custo_base_unitario: null,
        },
      ],
      promissorias: [],
    };

    render(
      <Wrapper>
        <PedidoForm editingOrder={editingOrder} />
      </Wrapper>,
    );

    expect(await screen.findByText("Lucro")).toBeInTheDocument();
    // Aceitar qualquer variante de espaço normal/NBSP em 'R$ 30,00'
    const lucroRegex = /R\$\s?30,00/;
    await waitFor(() => {
      const matches = screen.queryAllByText((content) =>
        lucroRegex.test(content),
      );
      expect(matches.length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      const totalNode = screen.queryByText((c) =>
        /Lucro Total:.*30,00/.test(c),
      );
      expect(totalNode).not.toBeNull();
    });
  });
});
