/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { PedidoForm } from "components/PedidoForm";

// Antes havia UI de checkbox para migrar FIFO; após simplificação, essa UI foi removida.
// Este teste agora apenas garante que editar um pedido legacy não quebra o submit
// e que NÃO enviamos migrar_fifo automaticamente.

const mockPut = jest.fn();

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("PedidoForm FIFO Legacy UI", () => {
  beforeEach(() => {
    mockPut.mockReset();
    global.fetch = jest.fn((url, opts) => {
      const u = String(url);
      if (u.includes("/api/v1/entities")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 10, label: "CLIENTE • PF", name: "CLIENTE" },
            ]),
        });
      }
      if (u.includes("/api/v1/produtos")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 50, label: "Produto X", preco_tabela: 100 },
            ]),
        });
      }
      if (u.includes("/api/v1/estoque/saldos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ saldo: 20 }),
        });
      }
      if (u.match(/\/api\/v1\/pedidos\/$/)) {
        // POST (não usado aqui)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 999 }),
        });
      }
      if (u.match(/\/api\/v1\/pedidos\/123$/) && opts?.method === "PUT") {
        const body = JSON.parse(opts.body || "{}");
        mockPut(body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  test("pedido legacy edita e envia PUT sem migrar_fifo automático", async () => {
    const editingOrder = {
      id: 123,
      tipo: "VENDA",
      fifo_aplicado: false,
      partner_entity_id: 10,
      partner_name: "CLIENTE",
      numero_promissorias: 1,
      itens: [
        { produto_id: 50, quantidade: 2, preco_unitario: 80, total_item: 160 },
      ],
      promissorias: [],
      status: "confirmado",
    };

    render(
      <Wrapper>
        <PedidoForm editingOrder={editingOrder} />
      </Wrapper>,
    );

    // Apenas submete direto
    const user = userEvent.setup();
    const submitBtn = screen.getByRole("button", { name: /Atualizar Pedido/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled();
    });
    const sent = mockPut.mock.calls[0][0];
    expect(sent.migrar_fifo).toBeUndefined();
  });
});
