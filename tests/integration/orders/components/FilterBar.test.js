/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "contexts/ThemeContext";
import FilterBar from "components/pedidos/orders/FilterBar";

// Mock das dependências
global.fetch = jest.fn();

function Wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("FilterBar Component", () => {
  const mockOnChange = jest.fn();
  const mockOnReload = jest.fn();

  const defaultFilters = {
    search: "",
    startDate: "",
    endDate: "",
    tipo: "",
    partner: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renderiza filtros básicos", () => {
    render(
      <Wrapper>
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReload={mockOnReload}
        />
      </Wrapper>,
    );

    // Verifica campos básicos
    expect(
      screen.getByPlaceholderText(/ID.*parceiro.*documento/i),
    ).toBeInTheDocument();
    // Não usar getByDisplayValue("") pois pode haver vários inputs vazios; já garantimos placeholder presente
  });

  test("permite busca por texto", async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReload={mockOnReload}
        />
      </Wrapper>,
    );

    const searchInput = screen.getByPlaceholderText(/ID.*parceiro.*documento/i);
    await user.type(searchInput, "teste busca");

    // Verifica que o onChange foi chamado com o valor
    expect(mockOnChange).toHaveBeenCalled();
  });

  test("possui botão de recarregar", () => {
    render(
      <Wrapper>
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReload={mockOnReload}
        />
      </Wrapper>,
    );

    const reloadButton = screen.getByRole("button", { name: /atualizar/i });
    fireEvent.click(reloadButton);

    expect(mockOnReload).toHaveBeenCalled();
  });

  test("funciona com filtros vazios", () => {
    render(
      <Wrapper>
        <FilterBar
          filters={defaultFilters}
          onChange={mockOnChange}
          onReload={mockOnReload}
        />
      </Wrapper>,
    );

    // Componente deve renderizar sem erros mesmo com filtros vazios
    expect(
      screen.getByPlaceholderText(/ID.*parceiro.*documento/i),
    ).toBeInTheDocument();
  });
});
