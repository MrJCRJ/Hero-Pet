/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { PedidoForm } from "components/PedidoForm";

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

// Após remoção do bloco legacy, mesmo pedidos fifo_aplicado=true ou false não exibem aviso.

describe("PedidoForm FIFO - não exibe bloco legacy quando fifo_aplicado=true", () => {
  test("não mostra aviso LEGACY nem checkbox de migração", async () => {
    const editingOrder = {
      id: 987,
      tipo: "VENDA",
      fifo_aplicado: true,
      partner_entity_id: 11,
      partner_name: "CLIENTE B",
      numero_promissorias: 1,
      itens: [
        { produto_id: 77, quantidade: 1, preco_unitario: 50, total_item: 50 },
      ],
      promissorias: [],
      status: "confirmado",
    };

    global.fetch = jest.fn((url) => {
      const u = String(url);
      if (u.includes("/api/v1/entities")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 11, label: "CLIENTE B • PF", name: "CLIENTE B" },
            ]),
        });
      }
      if (u.includes("/api/v1/produtos")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([{ id: 77, label: "Produto Y", preco_tabela: 50 }]),
        });
      }
      if (u.includes("/api/v1/estoque/saldos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ saldo: 5 }),
        });
      }
      if (u.match(/\/api\/v1\/pedidos\/987$/)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <Wrapper>
        <PedidoForm editingOrder={editingOrder} />
      </Wrapper>,
    );

    // Pequeno wait para qualquer efeito inicial
    await waitFor(() => {
      // Asserção de ausência permanece (texto não existe mais em nenhum cenário)
      expect(screen.queryByText(/LEGACY DE CUSTO/i)).toBeNull();
    });

    // Checkbox removido do design
    expect(
      screen.queryByRole("checkbox", { name: /Migrar este pedido para FIFO/i }),
    ).toBeNull();
  });
});
