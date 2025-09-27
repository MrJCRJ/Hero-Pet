/** @jest-environment jsdom */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { OrdersManager } from "components/orders";

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("OrdersManager erro de migração individual mantém estado ELIGIBLE", () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (url, opts) => {
      const u = String(url);
      if (u.includes("/api/v1/pedidos/legacy_count")) {
        return { ok: true, json: async () => ({ legacy_count: 0 }) };
      }
      if (u.includes("/api/v1/pedidos?")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 777,
              tipo: "VENDA",
              partner_name: "CLIENTE ERRO",
              data_emissao: "2025-09-22",
              total_liquido: 50,
              numero_promissorias: 1,
              tem_nota_fiscal: false,
              fifo_state: "eligible",
            },
          ],
        };
      }
      if (u.match(/\/api\/v1\/pedidos\/777$/) && opts?.method === "PUT") {
        return { ok: false, json: async () => ({ error: "Falha proposital" }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    // Evitar alerta real
    window.alert = () => {};
  });

  test("clica migrar, erro 500, badge segue ELIGIBLE e botão permanece", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <OrdersManager limit={20} />
      </Wrapper>,
    );
    await screen.findByText("CLIENTE ERRO");
    const row = screen.getByText("CLIENTE ERRO").closest("tr");
    expect(within(row).getByText("ELIGIBLE")).toBeInTheDocument();

    const btn = within(row).getByRole("button", { name: /Migrar FIFO/i });
    await user.click(btn);

    // Estado não deve mudar para FIFO
    expect(within(row).queryByText("FIFO")).toBeNull();
    expect(within(row).getByText("ELIGIBLE")).toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: /Migrar FIFO/i }),
    ).toBeInTheDocument();
  });
});
