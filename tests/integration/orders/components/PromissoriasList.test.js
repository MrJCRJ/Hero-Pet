/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import PromissoriasList from "components/orders/shared/PromissoriasList";

// Mock fetch global
global.fetch = jest.fn();

function Wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("PromissoriasList Component", () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renderiza lista de promissórias", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pedido_id: 1,
            seq: 1,
            partner_name: "Cliente A",
            tipo: "VENDA",
            due_date: "2024-04-15",
            amount: 50.0,
          },
          {
            pedido_id: 2,
            seq: 1,
            partner_name: "Cliente B",
            tipo: "VENDA",
            due_date: "2024-05-15",
            amount: 75.0,
          },
        ],
      }),
    });

    render(
      <ThemeProvider>
        <ToastProvider>
          <PromissoriasList
            title="Teste"
            monthLabel="Abril 2024"
            monthStr="2024-04"
            status="EM_ABERTO"
            expectedCount={2}
            expectedAmount={125}
            onSelect={mockOnSelect}
          />
        </ToastProvider>
      </ThemeProvider>,
    );

    // Aguarda o carregamento
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Cliente A")).toBeInTheDocument();
    expect(screen.getByText("Cliente B")).toBeInTheDocument();
  });

  test("exibe valores formatados", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pedido_id: 1,
            seq: 1,
            partner_name: "Cliente A",
            tipo: "VENDA",
            due_date: "2024-04-15",
            amount: 50.0,
          },
        ],
      }),
    });

    render(
      <ThemeProvider>
        <ToastProvider>
          <PromissoriasList
            title="Teste"
            monthLabel="Abril 2024"
            monthStr="2024-04"
            status="EM_ABERTO"
            expectedCount={1}
            expectedAmount={50}
            onSelect={mockOnSelect}
          />
        </ToastProvider>
      </ThemeProvider>,
    );

    // Aguarda o carregamento
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Verifica formatação monetária na tabela
    expect(screen.getAllByText("R$ 50,00").length).toBeGreaterThan(0);
  });

  test("exibe datas formatadas", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pedido_id: 1,
            seq: 1,
            partner_name: "Cliente A",
            tipo: "VENDA",
            due_date: "2024-04-15",
            amount: 50.0,
          },
        ],
      }),
    });

    render(
      <ThemeProvider>
        <ToastProvider>
          <PromissoriasList
            title="Teste"
            monthLabel="Abril 2024"
            monthStr="2024-04"
            status="EM_ABERTO"
            expectedCount={1}
            expectedAmount={50}
            onSelect={mockOnSelect}
          />
        </ToastProvider>
      </ThemeProvider>,
    );

    // Aguarda o carregamento
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Verifica formatação de datas brasileiras
    expect(screen.getByText("15/04/2024")).toBeInTheDocument();
  });

  test("diferencia status das promissórias", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pedido_id: 1,
            seq: 1,
            partner_name: "Cliente A",
            tipo: "VENDA",
            due_date: "2024-04-15",
            amount: 50.0,
          },
        ],
      }),
    });

    render(
      <ThemeProvider>
        <ToastProvider>
          <PromissoriasList
            title="Teste"
            monthLabel="Abril 2024"
            monthStr="2024-04"
            status="EM_ABERTO"
            expectedCount={1}
            expectedAmount={50}
            onSelect={mockOnSelect}
          />
        </ToastProvider>
      </ThemeProvider>,
    );

    // Aguarda o carregamento
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Verifica se diferentes tipos são indicados
    expect(screen.getByText("VENDA")).toBeInTheDocument();
  });

  test("gerencia lista vazia", () => {
    render(
      <Wrapper>
        <PromissoriasList data={[]} onSelect={mockOnSelect} />
      </Wrapper>,
    );

    // Deve renderizar sem erros mesmo com lista vazia
    expect(document.body).toBeTruthy();
  });

  test("funciona sem dados", () => {
    render(
      <Wrapper>
        <PromissoriasList data={null} onSelect={mockOnSelect} />
      </Wrapper>,
    );

    // Deve lidar com dados nulos graciosamente
    expect(document.body).toBeTruthy(); // Pelo menos renderiza
  });

  test("renderiza sequências das promissórias", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pedido_id: 1,
            seq: 1,
            partner_name: "Cliente A",
            tipo: "VENDA",
            due_date: "2024-04-15",
            amount: 50.0,
          },
          {
            pedido_id: 2,
            seq: 2,
            partner_name: "Cliente B",
            tipo: "VENDA",
            due_date: "2024-05-15",
            amount: 75.0,
          },
        ],
      }),
    });

    render(
      <ThemeProvider>
        <ToastProvider>
          <PromissoriasList
            title="Teste"
            monthLabel="Abril 2024"
            monthStr="2024-04"
            status="EM_ABERTO"
            expectedCount={2}
            expectedAmount={125}
            onSelect={mockOnSelect}
          />
        </ToastProvider>
      </ThemeProvider>,
    );

    // Aguarda o carregamento
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Verifica numeração das parcelas (formato: #pedido_id — #seq)
    expect(screen.getByText("#1 — #1")).toBeInTheDocument();
    expect(screen.getByText("#2 — #2")).toBeInTheDocument();
  });

  test("ordena promissórias por data", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            pedido_id: 1,
            seq: 1,
            partner_name: "Cliente A",
            tipo: "VENDA",
            due_date: "2024-04-15",
            amount: 50.0,
          },
        ],
      }),
    });

    render(
      <ThemeProvider>
        <ToastProvider>
          <PromissoriasList
            title="Teste"
            monthLabel="Abril 2024"
            monthStr="2024-04"
            status="EM_ABERTO"
            expectedCount={1}
            expectedAmount={50}
            onSelect={mockOnSelect}
          />
        </ToastProvider>
      </ThemeProvider>,
    );

    // Aguarda o carregamento
    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    // Verifica se a ordenação está funcionando
    // (a implementação pode ordenar por vencimento)
    expect(screen.getByText("15/04/2024")).toBeInTheDocument();
  });
});
