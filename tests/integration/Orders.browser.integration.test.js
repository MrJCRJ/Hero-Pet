/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { OrdersManager } from "components/pedidos/orders";
import { MSG } from "components/common/messages";

// Testa:
// - Lista vazia mostra mensagem MSG.PEDIDOS_EMPTY
// - Mock de fetch retorna lista com um pedido após recarregar
// - Exclusão dispara toast de sucesso e remove linha

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("Orders UI - Browser basic", () => {
  test("lista vazia exibe mensagem", async () => {
    global.fetch = jest.fn((input) => {
      const url = typeof input === "string" ? input : input?.url;
      if (url?.startsWith("/api/v1/pedidos?")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [], meta: { total: 0 } }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(
      <Wrapper>
        <OrdersManager />
      </Wrapper>,
    );

    // Título lista
    expect(await screen.findByText("Pedidos")).toBeInTheDocument();
    const table = await screen.findByRole("table");
    expect(within(table).getByText(MSG.PEDIDOS_EMPTY)).toBeInTheDocument();
  });

  test("deleção remove linha e mostra toast", async () => {
    const pedido = {
      id: 777,
      tipo: "VENDA",
      partner_name: "Cliente X",
      data_emissao: "2024-09-10",
      numero_promissorias: 0,
      tem_nota_fiscal: false,
      total_liquido: 100,
      frete_total: 0,
      total_pago: 0,
    };
    let deleted = false;
    global.fetch = jest.fn((input, init) => {
      const url = typeof input === "string" ? input : input?.url;
      if (url?.startsWith("/api/v1/pedidos?")) {
        if (!deleted) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [pedido], meta: { total: 1 } }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [], meta: { total: 0 } }),
        });
      }
      if (/\/api\/v1\/pedidos\/(\d+)$/.test(url) && init?.method === "DELETE") {
        deleted = true;
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <Wrapper>
        <OrdersManager />
      </Wrapper>,
    );

    // Linha presente
    const rowClient = await screen.findByText("Cliente X");
    expect(rowClient).toBeInTheDocument();

    const row = rowClient.closest("tr");
    const deleteBtn = within(row).getByRole("button", {
      name: /Excluir pedido/i,
    });
    fireEvent.click(deleteBtn);

    const confirmDialogTitle = await screen.findByText(
      MSG.ORDER_DELETE_CONFIRM_TITLE(pedido.id),
    );
    expect(confirmDialogTitle).toBeInTheDocument();

    // Botão de confirmação (label Excluir). Modal inclui botão Cancelar e fechar.
    const allButtons = await screen.findAllByRole("button", {
      name: /Excluir/,
    });
    // Seleciona aquele cujo texto exato seja 'Excluir' (exclui ícone hover invisível) e que não tenha aria-label diferente
    const confirmButton = allButtons.find(
      (btn) => btn.textContent === "Excluir",
    );
    expect(confirmButton).toBeTruthy();
    fireEvent.click(confirmButton);

    // Toast de sucesso (usa template)
    const successToast = await screen.findByText(
      MSG.ORDER_DELETED_SUCCESS(pedido.id),
    );
    expect(successToast).toBeInTheDocument();

    // Lista deve ficar vazia (mensagem de vazio)
    const emptyMsg = await screen.findByText(MSG.PEDIDOS_EMPTY);
    expect(emptyMsg).toBeInTheDocument();
  });
});
