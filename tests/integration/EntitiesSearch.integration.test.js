/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { EntitiesBrowser } from "components/entities/list/EntitiesBrowser";

global.fetch = jest.fn();

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("EntitiesBrowser Busca", () => {
  beforeEach(() => {
    fetch.mockClear();

    // Mock entidades para teste
    const mockEntities = [
      {
        id: 1,
        name: "João da Silva",
        doc: "11111111111",
        entity_type: "PF",
        address: { city: "São Paulo" },
        contact: { phone: "11999999999" },
      },
      {
        id: 2,
        name: "Maria Santos",
        doc: "22222222222",
        entity_type: "PJ",
        address: { city: "Rio de Janeiro" },
        contact: { phone: "21888888888" },
      },
      {
        id: 3,
        name: "Carlos Cliente",
        doc: "33333333333",
        entity_type: "PF",
        address: { city: "Belo Horizonte" },
        contact: { phone: "31777777777" },
      },
    ];

    // Mock resposta da API
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockEntities,
        meta: {
          total: mockEntities.length,
          offset: 0,
          limit: 20,
        },
      }),
    });
  });

  test("Campo de busca está presente e funcional", async () => {
    render(
      <Wrapper>
        <EntitiesBrowser />
      </Wrapper>,
    );

    // Aguardar o componente carregar
    await waitFor(() => {
      expect(screen.getByText("João da Silva")).toBeInTheDocument();
    });

    // Verificar se o campo de busca existe
    const searchInput = screen.getByPlaceholderText("Nome ou documento...");
    expect(searchInput).toBeInTheDocument();

    // Testar digitação no campo
    fireEvent.change(searchInput, { target: { value: "João" } });
    expect(searchInput.value).toBe("João");
  });

  test("Busca faz chamada para API com parâmetro correto", async () => {
    render(
      <Wrapper>
        <EntitiesBrowser />
      </Wrapper>,
    );

    // Aguardar carregamento inicial
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/entities"),
        expect.any(Object),
      );
    });

    const searchInput = screen.getByPlaceholderText("Nome ou documento...");

    // Simular digitação (debounce será testado no timeout)
    fireEvent.change(searchInput, { target: { value: "João" } });

    // Aguardar o debounce (500ms + margem)
    await waitFor(
      () => {
        const lastCall = fetch.mock.calls[fetch.mock.calls.length - 1];
        const url = lastCall[0];
        expect(url).toContain("q=Jo%C3%A3o");
      },
      { timeout: 1000 },
    );
  });

  test("Busca funciona junto com filtros", async () => {
    render(
      <Wrapper>
        <EntitiesBrowser />
      </Wrapper>,
    );

    // Aguardar carregamento inicial
    await waitFor(() => {
      expect(screen.getByText("João da Silva")).toBeInTheDocument();
    });

    // Aplicar filtro de tipo primeiro (buscar pelo ID específico)
    const profileSelect = screen.getByLabelText("Perfil");
    fireEvent.change(profileSelect, { target: { value: "client" } });

    // Aplicar busca
    const searchInput = screen.getByPlaceholderText("Nome ou documento...");
    fireEvent.change(searchInput, { target: { value: "João" } });

    // Verificar se a última chamada contém ambos os parâmetros
    await waitFor(
      () => {
        const lastCall = fetch.mock.calls[fetch.mock.calls.length - 1];
        const url = lastCall[0];
        expect(url).toContain("entity_type=PF");
        expect(url).toContain("q=Jo%C3%A3o");
      },
      { timeout: 1000 },
    );
  });
});
