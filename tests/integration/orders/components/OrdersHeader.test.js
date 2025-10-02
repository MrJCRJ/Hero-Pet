/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import OrdersHeader from "components/pedidos/orders/OrdersHeader";

function Wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("OrdersHeader Component", () => {
  test("renderiza cabeçalhos da tabela", () => {
    render(
      <Wrapper>
        <table>
          <OrdersHeader />
        </table>
      </Wrapper>,
    );

    // Verifica se renderiza os principais cabeçalhos da tabela
    expect(screen.getByText(/parceiro/i)).toBeInTheDocument();
    expect(screen.getByText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByText(/emissão/i)).toBeInTheDocument();
  });

  test("renderiza estrutura correta de thead", () => {
    const { container } = render(
      <Wrapper>
        <table>
          <OrdersHeader />
        </table>
      </Wrapper>,
    );

    // Verifica se existe thead na estrutura
    const thead = container.querySelector("thead");
    expect(thead).not.toBeNull();

    // Verifica se há células th
    const headers = container.querySelectorAll("th");
    expect(headers.length).toBeGreaterThan(3); // Pelo menos 4 colunas
  });

  test("cabeçalhos têm estilos adequados", () => {
    const { container } = render(
      <Wrapper>
        <table>
          <OrdersHeader />
        </table>
      </Wrapper>,
    );

    const firstHeader = container.querySelector("th");
    expect(firstHeader).toHaveClass("text-left"); // Verifica se tem classes CSS
  });
});
