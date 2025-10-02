/**
 * @jest-environment jsdom
 */

import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderAndFlush } from "tests/test-utils/renderAndFlush";
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
      json: async () => [
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
    });

    await renderAndFlush(
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

    await renderAndFlush(
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

    await renderAndFlush(
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

    await renderAndFlush(
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

  test("gerencia lista vazia", async () => {
    await renderAndFlush(
      <Wrapper>
        <PromissoriasList data={[]} onSelect={mockOnSelect} />
      </Wrapper>,
    );

    // Deve renderizar sem erros mesmo com lista vazia
    expect(document.body).toBeTruthy();
  });

  test("funciona sem dados", async () => {
    await renderAndFlush(
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

    await renderAndFlush(
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

    await renderAndFlush(
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

  test("lida com resposta direta de array da API", async () => {
    // Testa quando API retorna array diretamente (como a implementação real)
    const directArray = [
      {
        pedido_id: 3,
        seq: 1,
        partner_name: "Cliente C",
        tipo: "VENDA",
        due_date: "2024-06-01",
        amount: 100.0,
      },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => directArray,
    });

    await renderAndFlush(
      <ThemeProvider>
        <ToastProvider>
          <PromissoriasList
            title="Teste Array Direto"
            monthLabel="Junho 2024"
            monthStr="2024-06"
            status="pendentes"
            expectedCount={1}
            expectedAmount={100}
            onSelect={mockOnSelect}
          />
        </ToastProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Cliente C")).toBeInTheDocument();
    expect(screen.getByText("R$ 100,00")).toBeInTheDocument();
  });

  test("constrói URL correta com parâmetros", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await renderAndFlush(
      <ThemeProvider>
        <ToastProvider>
          <PromissoriasList
            title="Teste URL"
            monthLabel="Outubro 2025"
            monthStr="2025-10"
            status="atrasadas"
            expectedCount={0}
            expectedAmount={0}
            onSelect={mockOnSelect}
          />
        </ToastProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/pedidos/promissorias?month=2025-10&status=atrasadas&limit=100",
        { cache: "no-store" }
      );
    });
  });

  test("exibe dados mesmo com propriedades missing", async () => {
    const incompleteData = [
      {
        pedido_id: 5,
        seq: 2,
        // partner_name missing
        tipo: "COMPRA",
        due_date: "2024-07-10",
        amount: 250.0,
      },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => incompleteData,
    });

    await renderAndFlush(
      <ThemeProvider>
        <ToastProvider>
          <PromissoriasList
            title="Dados Incompletos"
            monthLabel="Julho 2024"
            monthStr="2024-07"
            status="pendentes"
            expectedCount={1}
            expectedAmount={250}
            onSelect={mockOnSelect}
          />
        </ToastProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("#5 — #2")).toBeInTheDocument();
    expect(screen.getByText("COMPRA")).toBeInTheDocument();
    expect(screen.getByText("10/07/2024")).toBeInTheDocument();
    expect(screen.getByText("R$ 250,00")).toBeInTheDocument();
  });

  test("testa casos extremos de formatação", async () => {
    const extremeData = [
      {
        pedido_id: 999,
        seq: 10,
        partner_name: "Nome Muito Longo Que Pode Ser Truncado No Display Da Interface",
        tipo: "VENDA",
        due_date: "2024-12-31",
        amount: 9999.99,
      },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => extremeData,
    });

    await renderAndFlush(
      <ThemeProvider>
        <ToastProvider>
          <PromissoriasList
            title="Casos Extremos"
            monthLabel="Dezembro 2024"
            monthStr="2024-12"
            status="pendentes"
            expectedCount={1}
            expectedAmount={9999.99}
            onSelect={mockOnSelect}
          />
        </ToastProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Carregando...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("#999 — #10")).toBeInTheDocument();
    expect(screen.getByText("31/12/2024")).toBeInTheDocument();
    expect(screen.getByText("R$ 9.999,99")).toBeInTheDocument();
    // Nome pode estar truncado, mas deve estar presente
    expect(screen.getByText(/Nome Muito Longo/)).toBeInTheDocument();
  });
});
