/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import DashboardCards from "components/pedidos/orders/dashboard/DashboardCards";

function Wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("DashboardCards Component", () => {
  const mockData = {
    vendasMes: 1000,
    comprasMes: 800,
    lucroBruto: 200,
    promissorias: {
      proximoMes: {
        pendentes: { count: 3, valor: 150 },
      },
      mesAtual: {
        atrasados: { count: 1, valor: 50 },
      },
      deMesesAnteriores: {
        emAberto: { count: 2, valor: 100 },
      },
    },
  };

  const mockOnCardClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renderiza cards do dashboard", () => {
    render(
      <Wrapper>
        <DashboardCards data={mockData} onCardClick={mockOnCardClick} />
      </Wrapper>,
    );

    // Verifica se renderiza cards principais
    const receitas = screen.getAllByText(/1\.000/);
    expect(receitas.length).toBeGreaterThan(0); // vendasMes aparece em múltiplos cards
    expect(screen.getByText(/800/)).toBeInTheDocument(); // comprasMes
  });

  test("cards são clicáveis", () => {
    render(
      <Wrapper>
        <DashboardCards data={mockData} onCardClick={mockOnCardClick} />
      </Wrapper>,
    );

    // Procura por cards clicáveis
    const cards = screen
      .getAllByRole("button")
      .filter(
        (btn) =>
          btn.textContent.includes("1.000") || btn.textContent.includes("800"),
      );

    // Deve ter pelo menos um card clicável
    expect(cards.length).toBeGreaterThan(0);
    fireEvent.click(cards[0]);
    expect(mockOnCardClick).toHaveBeenCalled();
  });

  test("exibe dados de promissórias", () => {
    render(
      <Wrapper>
        <DashboardCards data={mockData} onCardClick={mockOnCardClick} />
      </Wrapper>,
    );

    // Verifica se dados de promissórias são exibidos
    expect(screen.getByText(/3\s*itens/)).toBeInTheDocument(); // próximo mês
  });

  test("gerencia dados vazios graciosamente", () => {
    const emptyData = {
      vendasMes: 0,
      comprasMes: 0,
      promissorias: {
        proximoMes: { pendentes: { count: 0, valor: 0 } },
        mesAtual: { atrasados: { count: 0, valor: 0 } },
        deMesesAnteriores: { emAberto: { count: 0, valor: 0 } },
      },
    };

    render(
      <Wrapper>
        <DashboardCards data={emptyData} onCardClick={mockOnCardClick} />
      </Wrapper>,
    );

    // Deve renderizar sem erros mesmo com dados zerados
    const zeroElements = screen.getAllByText(/0/);
    expect(zeroElements.length).toBeGreaterThan(0);
  });

  test("exibe formatação monetária correta", () => {
    render(
      <Wrapper>
        <DashboardCards data={mockData} onCardClick={mockOnCardClick} />
      </Wrapper>,
    );

    // Verifica se valores são formatados como moeda brasileira
    const monetaryValues = screen.getAllByText(/R\$/);
    expect(monetaryValues.length).toBeGreaterThan(0);
  });

  test("renderiza grid de cards", () => {
    const { container } = render(
      <Wrapper>
        <DashboardCards data={mockData} onCardClick={mockOnCardClick} />
      </Wrapper>,
    );

    // Verifica estrutura em flex
    const flexContainer = container.querySelector(".flex");
    expect(flexContainer).not.toBeNull();
  });

  test("permite clique em diferentes tipos de card", () => {
    render(
      <Wrapper>
        <DashboardCards data={mockData} onCardClick={mockOnCardClick} />
      </Wrapper>,
    );

    const clickableElements = screen.getAllByRole("button");

    // Testa clique em múltiplos cards
    expect(clickableElements.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(clickableElements[0]);
    fireEvent.click(clickableElements[1]);

    expect(mockOnCardClick).toHaveBeenCalledTimes(2);
  });
});
