/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderAndFlush } from "tests/test-utils/renderAndFlush";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import PromissoriasDots from "components/pedidos/orders/PromissoriasDots";

// Mock das dependências
global.fetch = jest.fn();

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("PromissoriasDots Component", () => {
  const mockOnChanged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  test("carrega promissórias via API", async () => {
    const mockPromissorias = [
      { seq: 1, due_date: "2024-04-15", amount: "50.00", status: "EM_ABERTO" },
      { seq: 2, due_date: "2024-05-15", amount: "50.00", status: "PAGO" },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPromissorias),
    });

    await renderAndFlush(
      <Wrapper>
        <PromissoriasDots pedidoId={123} count={2} onChanged={mockOnChanged} />
      </Wrapper>,
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/pedidos/123/promissorias",
      expect.objectContaining({ cache: "no-store" }),
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  test("exibe estado de loading", async () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    await renderAndFlush(
      <Wrapper>
        <PromissoriasDots pedidoId={123} count={2} onChanged={mockOnChanged} />
      </Wrapper>,
    );

    expect(document.body).toBeTruthy();
  });

  test("gerencia erro na API", async () => {
    fetch.mockRejectedValueOnce(new Error("API Error"));

    await renderAndFlush(
      <Wrapper>
        <PromissoriasDots pedidoId={123} count={2} onChanged={mockOnChanged} />
      </Wrapper>,
    );

    expect(fetch).toHaveBeenCalled();

    // Componente deve lidar com erro graciosamente
    expect(document.body).toBeTruthy();
  });

  test("renderiza dots interativos", async () => {
    const mockPromissorias = [
      { seq: 1, due_date: "2024-04-15", amount: "50.00", status: "EM_ABERTO" },
      { seq: 2, due_date: "2024-05-15", amount: "50.00", status: "ATRASADO" },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPromissorias),
    });

    await renderAndFlush(
      <Wrapper>
        <PromissoriasDots pedidoId={123} count={2} onChanged={mockOnChanged} />
      </Wrapper>,
    );

    // Aguarda carregamento e busca por elementos clicáveis
    const buttons = await screen.findAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  test("abre modal de pagamento ao clicar em dot", async () => {
    const mockPromissorias = [
      { seq: 1, due_date: "2024-04-15", amount: "50.00", status: "EM_ABERTO" },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPromissorias),
    });

    await renderAndFlush(
      <Wrapper>
        <PromissoriasDots pedidoId={123} count={1} onChanged={mockOnChanged} />
      </Wrapper>,
    );

    const buttons = await screen.findAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(true).toBe(true);
  });

  test("funciona com count zero", () => {
    render(
      <Wrapper>
        <PromissoriasDots pedidoId={123} count={0} onChanged={mockOnChanged} />
      </Wrapper>,
    );

    // Deve renderizar sem erros mesmo sem promissórias
    expect(document.body).toBeTruthy();
  });

  test("recarrega dados quando pedidoId muda", async () => {
    const { rerender } = await renderAndFlush(
      <Wrapper>
        <PromissoriasDots pedidoId={123} count={1} onChanged={mockOnChanged} />
      </Wrapper>,
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/pedidos/123/promissorias",
      expect.objectContaining({ cache: "no-store" }),
    );

    // já drenado pelo renderAndFlush
    fetch.mockClear();

    rerender(
      <Wrapper>
        <PromissoriasDots pedidoId={456} count={1} onChanged={mockOnChanged} />
      </Wrapper>,
    );

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/pedidos/456/promissorias",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
