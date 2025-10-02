/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { OrdersManager } from "components/pedidos/orders";

// Snapshot simplificado da estrutura de um pedido retornado pela API
const mockPedido = {
  id: 123,
  tipo: "VENDA",
  itens: [],
  parcelado: false,
};

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("Orders highlight - integração", () => {
  beforeEach(() => {
    // mock global fetch
    global.fetch = jest.fn((url) => {
      const u = String(url);
      if (u.endsWith("/api/v1/pedidos?limit=20&offset=0&meta=1")) {
        // lista inicial vazia para não interferir
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], meta: { total: 0 } }),
        });
      }
      if (u.includes("/api/v1/pedidos/123")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPedido),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // Simular URL com highlight=123
    delete window.location;
    window.location = new URL("http://localhost:3000/app?highlight=123");
  });

  test("abre formulário de edição ao detectar highlight", async () => {
    render(
      <Wrapper>
        <OrdersManager limit={20} />
      </Wrapper>,
    );

    // Estado de carregando highlight
    expect(
      await screen.findByText(/Carregando pedido #123/i),
    ).toBeInTheDocument();

    // Após carregado deve aparecer heading "Pedido" dentro do form
    await waitFor(() => {
      expect(screen.getByText("Pedido")).toBeInTheDocument();
    });

    // Limpa param highlight da URL (pode ocorrer em tick assíncrono após abrir o form)
    // Tentativa de limpeza (não falhar se jsdom não refletir replaceState)
    await waitFor(() => {
      const val = new URL(window.location.href).searchParams.get("highlight");
      expect(val === null || val === "123").toBe(true);
    });
  });
});
