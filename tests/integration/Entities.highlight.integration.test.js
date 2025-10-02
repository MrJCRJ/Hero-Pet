/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { EntitiesManager } from "components/entities/form/EntitiesManager";

const mockEntity = {
  id: 7,
  name: "Cliente Demo",
  entity_type: "PF",
  document_digits: "12345678901",
  document_status: "valid",
  document_pending: false,
};

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("Entities highlight - integração", () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      const u = String(url);
      if (u.startsWith("/api/v1/entities?")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], meta: { total: 0 } }),
        });
      }
      if (u.includes("/api/v1/entities/7")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEntity),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    delete window.location;
    window.location = new URL("http://localhost:3000/entities?highlight=7");
  });

  test("abre formulário de entidade via highlight", async () => {
    render(
      <Wrapper>
        <EntitiesManager />
      </Wrapper>,
    );

    // Aguardar indicador de loading do highlight
    await screen.findByText(/Carregando entidade #7/i);
    // Agora aguardar abertura do form completo
    await waitFor(() => {
      expect(
        screen.getByText(/Formulário de Cliente \/ Fornecedor/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /Cancelar/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      const val = new URL(window.location.href).searchParams.get("highlight");
      expect(val === null || val === "7").toBe(true);
    });
  });
});
