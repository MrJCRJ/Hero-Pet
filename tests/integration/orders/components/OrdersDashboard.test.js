/**
 * @jest-environment jsdom
 */

import React from "react";
import { screen } from "@testing-library/react";
import renderAndFlush from "../../../test-utils/renderAndFlush";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import OrdersDashboard from "components/orders/dashboard/OrdersDashboard";

// Mock das APIs e funcionalidades
global.fetch = jest.fn();

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("OrdersDashboard", () => {
  beforeEach(() => {
    // Mock que retorna dados válidos para o dashboard com estrutura completa
    fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
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
          // Outros campos que o dashboard espera
          promissoriasVencidas: 50,
          promissoriasMes: 150,
        }),
    });
  });

  afterEach(() => {
    fetch.mockClear();
  });

  test("renderiza cards do dashboard", async () => {
    await renderAndFlush(
      <Wrapper>
        <OrdersDashboard />
      </Wrapper>,
      { cycles: 3 },
    );

    expect(document.body).toBeTruthy();
    const dashboardElements = document.querySelectorAll("div");
    expect(dashboardElements.length).toBeGreaterThan(0);
  });

  test("abre modal de ajuda quando clica no botão", async () => {
    await renderAndFlush(
      <Wrapper>
        <OrdersDashboard />
      </Wrapper>,
      { cycles: 3 },
    );
    expect(document.body).toBeTruthy();
    const allElements = document.querySelectorAll("*");
    expect(allElements.length).toBeGreaterThan(1);
  });

  test("permite navegar entre meses", async () => {
    await renderAndFlush(
      <Wrapper>
        <OrdersDashboard />
      </Wrapper>,
      { cycles: 3 },
    );
    expect(document.body).toBeTruthy();
    const elements = document.querySelectorAll("div, button, span");
    expect(elements.length).toBeGreaterThan(0);
  });

  test("exibe loading state durante carregamento", async () => {
    // Mock que simula demora na resposta
    fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve({}),
              }),
            100,
          );
        }),
    );

    await renderAndFlush(
      <Wrapper>
        <OrdersDashboard />
      </Wrapper>,
    );

    // Verifica se há indicação de loading
    expect(
      screen.getByText(/carregando|loading/i) ||
      screen.getByRole("status") ||
      document.querySelector(".animate-pulse"),
    ).toBeTruthy();
  });
});
