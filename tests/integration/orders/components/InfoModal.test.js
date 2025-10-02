import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import renderAndFlush from "../../../test-utils/renderAndFlush";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import InfoModal from "components/orders/modals/InfoModal";

// Mock fetch global
global.fetch = jest.fn();

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("InfoModal Component", () => {
  const mockOnClose = jest.fn();
  const mockData = {
    comprasMes: 800,
    vendasMes: 1000,
    comprasHistory: [
      { month: "2024-01", valor: 500 },
      { month: "2024-02", valor: 600 },
      { month: "2024-03", valor: 700 },
      { month: "2024-04", valor: 800 }
    ],
    promissorias: {
      mesAtual: {
        pendentes: { count: 2, valor: 150 },
        atrasados: { count: 1, valor: 50 }
      },
      proximoMes: {
        pendentes: { count: 3, valor: 200 }
      },
      deMesesAnteriores: {
        emAberto: { count: 1, valor: 75 }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });
  });

  test("renderiza modal de promissórias pendentes", async () => {
    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="promissorias_pendentes"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    expect(screen.getByText("Promissórias pendentes (mês)")).toBeInTheDocument();
    expect(screen.getByText("Promissórias pendentes — outubro/2025")).toBeInTheDocument();

    // Aguarda carregamento
    await waitFor(() => {
      expect(screen.getByText("Esperado pelo resumo: 2 itens — R$ 150,00")).toBeInTheDocument();
    });
  });

  test("renderiza modal de promissórias atrasadas", async () => {
    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="promissorias_atrasadas"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    expect(screen.getByText("Promissórias atrasadas (mês)")).toBeInTheDocument();
    expect(screen.getByText("Promissórias atrasadas — outubro/2025")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Esperado pelo resumo: 1 itens — R$ 50,00")).toBeInTheDocument();
    });
  });

  test("renderiza modal próximo mês", async () => {
    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="proximo_mes"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    expect(screen.getByText("Vão para o próximo mês")).toBeInTheDocument();
    expect(screen.getByText("Promissórias que irão para o próximo mês — outubro/2025")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Esperado pelo resumo: 3 itens — R$ 200,00")).toBeInTheDocument();
    });
  });

  test("renderiza modal carry over", async () => {
    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="carry_over"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    expect(screen.getByText("Vieram de meses anteriores")).toBeInTheDocument();
    expect(screen.getByText("Promissórias que vieram de meses anteriores — outubro/2025")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Esperado pelo resumo: 1 itens — R$ 75,00")).toBeInTheDocument();
    });
  });

  test("carrega dados da API quando abre modal", async () => {
    const mockPromissorias = [
      {
        pedido_id: 1,
        seq: 1,
        partner_name: "Cliente A",
        tipo: "VENDA",
        due_date: "2025-10-15",
        amount: 150.0
      },
      {
        pedido_id: 2,
        seq: 1,
        partner_name: "Cliente B",
        tipo: "VENDA",
        due_date: "2025-10-20",
        amount: 200.0
      }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPromissorias
    });

    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="promissorias_pendentes"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    // Verifica se a API foi chamada com parâmetros corretos
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/pedidos/promissorias?month=2025-10&status=pendentes&limit=100"),
        expect.objectContaining({
          cache: "no-store"
        })
      );
    });

    // Aguarda os dados aparecerem
    await waitFor(() => {
      expect(screen.getByText("Cliente A")).toBeInTheDocument();
      expect(screen.getByText("Cliente B")).toBeInTheDocument();
      expect(screen.getByText("R$ 150,00")).toBeInTheDocument();
      expect(screen.getByText("R$ 200,00")).toBeInTheDocument();
    });
  });

  test("exibe erro quando API falha", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Falha na API" })
    });

    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="promissorias_pendentes"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Erro: Falha na API")).toBeInTheDocument();
    });
  });

  test("exibe estado de loading", async () => {
    // Mock que nunca resolve para simular loading permanente
    global.fetch.mockImplementation(() => new Promise(() => { }));

    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="promissorias_pendentes"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  test("exibe mensagem quando não há itens", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="promissorias_pendentes"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Nenhum item encontrado")).toBeInTheDocument();
    });
  });

  test("fecha modal ao clicar no botão fechar", async () => {
    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="promissorias_pendentes"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    // Procura por botões de fechar (X ou similar)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);

    // Clica no primeiro botão (assumindo que é o fechar)
    fireEvent.click(buttons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test("renderiza modal de compras", async () => {
    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="comprasMes"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    expect(screen.getByText("Compras do mês")).toBeInTheDocument();
    // Relaxa dependência de emojis que podem variar em encoding
    expect(screen.getByText(/Histórico de Compras \(12 meses\)/)).toBeInTheDocument();
    expect(screen.getByText(/Glossário:/)).toBeInTheDocument();
  });

  test("renderiza modal de lucro bruto", async () => {
    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="lucro_bruto"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    expect(screen.getByText("Lucro bruto")).toBeInTheDocument();
  });

  test("renderiza modal de crescimento", async () => {
    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="crescimento_mom"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    expect(screen.getByText("Crescimento (mês vs. anterior)")).toBeInTheDocument();
  });

  test("renderiza modal padrão para cardKey desconhecida", async () => {
    await renderAndFlush(
      <Wrapper>
        <InfoModal
          cardKey="unknown_key"
          data={mockData}
          monthLabel="outubro/2025"
          monthStr="2025-10"
          onClose={mockOnClose}
        />
      </Wrapper>
    );

    expect(screen.getByText("Detalhes")).toBeInTheDocument();
    expect(screen.getByText("Sem detalhes.")).toBeInTheDocument();
  });

  test("usa parâmetros corretos para diferentes tipos de promissórias", async () => {
    const testCases = [
      { cardKey: "promissorias_pendentes", expectedStatus: "pendentes" },
      { cardKey: "promissorias_atrasadas", expectedStatus: "atrasadas" },
      { cardKey: "proximo_mes", expectedStatus: "proximo" },
      { cardKey: "carry_over", expectedStatus: "carry" }
    ];

    for (const { cardKey, expectedStatus } of testCases) {
      global.fetch.mockClear();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      await renderAndFlush(
        <Wrapper>
          <InfoModal
            cardKey={cardKey}
            data={mockData}
            monthLabel="outubro/2025"
            monthStr="2025-10"
            onClose={mockOnClose}
          />
        </Wrapper>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`status=${expectedStatus}`),
          expect.any(Object)
        );
      });
    }
  });
});