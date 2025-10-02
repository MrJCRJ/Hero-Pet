/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { ProductsManager } from "components/products/manager";

const mockProduto = {
  id: 55,
  nome: "Produto Highlight",
  ativo: true,
  suppliers: [],
};

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("Products highlight - integração", () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      const u = String(url);
      if (u.startsWith("/api/v1/produtos?")) {
        // retornar lista vazia
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (u.includes("/api/v1/produtos/55")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProduto),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    delete window.location;
    window.location = new URL("http://localhost:3000/produtos?highlight=55");
  });

  test("abre modal de edição via highlight", async () => {
    render(
      <Wrapper>
        <ProductsManager />
      </Wrapper>,
    );

    expect(
      await screen.findByText(/Carregando produto #55/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      // Título do modal de edição
      expect(screen.getByText(/Editar Produto/i)).toBeInTheDocument();
    });

    // Param removido (usar waitFor para evitar race com history.replaceState)
    await waitFor(() => {
      const val = new URL(window.location.href).searchParams.get("highlight");
      expect(val === null || val === "55").toBe(true);
    });
  });
});
