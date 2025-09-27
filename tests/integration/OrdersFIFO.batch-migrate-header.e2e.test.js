/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
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

describe("OrdersManager botão Migrar FIFO (x) header", () => {
  beforeEach(() => {
    let migratedAll = false;
    global.fetch = jest.fn(async (url, opts) => {
      const u = String(url);
      if (u.includes("/api/v1/pedidos/legacy_count")) {
        return {
          ok: true,
          json: async () => ({ legacy_count: migratedAll ? 0 : 3 }),
        };
      }
      if (
        u.includes("/api/v1/pedidos/migrate_fifo_all") &&
        opts?.method === "POST"
      ) {
        migratedAll = true;
        return {
          ok: true,
          json: async () => ({ migrated: 3, remaining_hint: "0 restantes" }),
        };
      }
      if (u.includes("/api/v1/pedidos?")) {
        // Uma lista simples
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  test("executa migração em massa e some botão", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <OrdersManager limit={20} />
      </Wrapper>,
    );

    // Espera botão header com contagem
    const batchBtn = await screen.findByRole("button", {
      name: /Migrar FIFO \(3\)/i,
    });
    expect(batchBtn).toBeInTheDocument();

    // Confirm dialog: mock window.confirm para aceitar
    const originalConfirm = window.confirm;
    const originalAlert = window.alert;
    window.confirm = () => true;
    window.alert = () => {};

    await user.click(batchBtn);

    // Após migração o botão deve desaparecer (legacy_count = 0)
    expect(
      screen.queryByRole("button", { name: /Migrar FIFO \(3\)/i }),
    ).toBeNull();

    window.confirm = originalConfirm;
    window.alert = originalAlert;
  });
});
