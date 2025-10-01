/**
 * @jest-environment jsdom
 */

import React from "react";
import { render } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import ComprasHistoryChart from "components/orders/charts/ComprasHistoryChart";
import LucroBrutoDetails from "components/orders/charts/LucroBrutoDetails";
import VendasComprasOverlayDetails from "components/orders/charts/VendasComprasOverlayDetails";

function Wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("Orders Charts", () => {
  describe("ComprasHistoryChart", () => {
    const mockData = [
      { month: "2024-01", value: 1000, label: "Jan/24" },
      { month: "2024-02", value: 1200, label: "Fev/24" },
      { month: "2024-03", value: 800, label: "Mar/24" },
    ];

    test("renderiza sem erros", () => {
      render(
        <Wrapper>
          <ComprasHistoryChart data={mockData} />
        </Wrapper>,
      );

      // Teste básico de renderização
      expect(document.body).toBeTruthy();
    });

    test("renderiza com dados vazios", () => {
      render(
        <Wrapper>
          <ComprasHistoryChart data={[]} />
        </Wrapper>,
      );

      // Não deve quebrar com dados vazios
      expect(document.body).toBeTruthy();
    });
  });

  describe("LucroBrutoDetails", () => {
    const mockData = [
      { month: "2024-01", lucro: 200, margem: 20, vendas: 1000 },
      { month: "2024-02", lucro: 250, margem: 25, vendas: 1000 },
      { month: "2024-03", lucro: 150, margem: 15, vendas: 1000 },
    ];

    test("renderiza sem erros", () => {
      render(
        <Wrapper>
          <LucroBrutoDetails data={mockData} />
        </Wrapper>,
      );

      expect(document.body).toBeTruthy();
    });
  });

  describe("VendasComprasOverlayDetails", () => {
    const mockData = [
      { month: "2024-01", vendas: 1000, compras: 800, label: "Jan/24" },
      { month: "2024-02", vendas: 1200, compras: 900, label: "Fev/24" },
      { month: "2024-03", vendas: 1100, compras: 850, label: "Mar/24" },
    ];

    test("renderiza sem erros", () => {
      render(
        <Wrapper>
          <VendasComprasOverlayDetails data={mockData} />
        </Wrapper>,
      );

      expect(document.body).toBeTruthy();
    });

    test("funciona com dados vazios", () => {
      render(
        <Wrapper>
          <VendasComprasOverlayDetails data={[]} />
        </Wrapper>,
      );

      // Não deve quebrar com dados vazios
      expect(document.body).toBeTruthy();
    });
  });
});
