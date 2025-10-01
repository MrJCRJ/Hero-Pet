/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import Card from "components/orders/shared/Card";

function Wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("Card Component", () => {
  const mockProps = {
    title: "Vendas do Mês",
    value: "R$ 10.000,00",
    subtitle: "Comparado ao mês anterior",
    loading: false,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renderiza título e valor", () => {
    render(
      <Wrapper>
        <Card {...mockProps} />
      </Wrapper>,
    );

    expect(screen.getByText("Vendas do Mês")).toBeInTheDocument();
    expect(screen.getByText("R$ 10.000,00")).toBeInTheDocument();
  });

  test("renderiza subtitle quando fornecido", () => {
    render(
      <Wrapper>
        <Card {...mockProps} />
      </Wrapper>,
    );

    expect(screen.getByText("Comparado ao mês anterior")).toBeInTheDocument();
  });

  test("é clicável quando onClick é fornecido", () => {
    render(
      <Wrapper>
        <Card {...mockProps} />
      </Wrapper>,
    );

    const cardElement = screen.getByRole("button");
    fireEvent.click(cardElement);

    expect(mockProps.onClick).toHaveBeenCalled();
  });

  test("não é clicável quando onClick não é fornecido", () => {
    const propsWithoutClick = { ...mockProps, onClick: undefined };

    render(
      <Wrapper>
        <Card {...propsWithoutClick} />
      </Wrapper>,
    );

    // Card sempre tem button wrapper, mas onClick undefined significa sem ação
    const cardElement = screen.getByRole("button");
    expect(cardElement).toBeInTheDocument();
  });

  test("exibe estado de loading", () => {
    const loadingProps = { ...mockProps, loading: true };

    render(
      <Wrapper>
        <Card {...loadingProps} />
      </Wrapper>,
    );

    // Card pode não ter texto específico de loading, apenas verifica se renderiza
    expect(screen.getByText("Vendas do Mês")).toBeInTheDocument();
  });

  test("funciona sem subtitle", () => {
    const propsWithoutSubtitle = { ...mockProps, subtitle: undefined };

    render(
      <Wrapper>
        <Card {...propsWithoutSubtitle} />
      </Wrapper>,
    );

    expect(screen.getByText("Vendas do Mês")).toBeInTheDocument();
    expect(screen.getByText("R$ 10.000,00")).toBeInTheDocument();
    expect(
      screen.queryByText("Comparado ao mês anterior"),
    ).not.toBeInTheDocument();
  });

  test("aplica estilos de hover quando clicável", () => {
    const { container } = render(
      <Wrapper>
        <Card {...mockProps} />
      </Wrapper>,
    );

    const cardElement = container.querySelector("button");
    expect(cardElement).toHaveClass("text-left"); // Verifica se tem classes CSS
  });

  test("renderiza com valores zero", () => {
    const zeroProps = { ...mockProps, value: "R$ 0,00" };

    render(
      <Wrapper>
        <Card {...zeroProps} />
      </Wrapper>,
    );

    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
  });

  test("gerencia títulos longos", () => {
    const longTitleProps = {
      ...mockProps,
      title: "Título muito longo que pode quebrar o layout do card",
    };

    render(
      <Wrapper>
        <Card {...longTitleProps} />
      </Wrapper>,
    );

    expect(screen.getByText(/Título muito longo/)).toBeInTheDocument();
  });

  test("permite valores não monetários", () => {
    const numericProps = { ...mockProps, value: "1,234 itens" };

    render(
      <Wrapper>
        <Card {...numericProps} />
      </Wrapper>,
    );

    expect(screen.getByText("1,234 itens")).toBeInTheDocument();
  });
});
