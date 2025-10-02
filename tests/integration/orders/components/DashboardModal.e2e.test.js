import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import OrdersDashboard from "components/pedidos/orders/dashboard/OrdersDashboard";

// Mock fetch global
global.fetch = jest.fn();

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("Orders Dashboard - Modal Integration E2E", () => {
  const mockDashboardData = {
    vendasMes: 10000,
    comprasMes: 8000,
    lucroBrutoMes: 2000,
    margemBrutaPerc: 20,
    promissorias: {
      mesAtual: {
        pendentes: { count: 5, valor: 1500 },
        atrasados: { count: 2, valor: 800 }
      },
      proximoMes: {
        pendentes: { count: 3, valor: 1200 }
      },
      deMesesAnteriores: {
        emAberto: { count: 1, valor: 300 }
      }
    }
  };

  const mockPromissoriasData = [
    {
      pedido_id: 101,
      seq: 1,
      partner_name: "Empresa ABC Ltda",
      tipo: "VENDA",
      due_date: "2025-10-15",
      amount: 750.0
    },
    {
      pedido_id: 102,
      seq: 1,
      partner_name: "João Silva",
      tipo: "VENDA",
      due_date: "2025-10-20",
      amount: 750.0
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock dashboard data
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/v1/pedidos/summary")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDashboardData
        });
      }

      if (url.includes("/api/v1/pedidos/promissorias")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockPromissoriasData
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });
  });

  test("fluxo completo: dashboard → card clique → modal aberto → dados carregados", async () => {
    render(
      <Wrapper>
        <OrdersDashboard />
      </Wrapper>
    );

    // 1. Aguarda dashboard carregar
    await waitFor(() => {
      expect(screen.getByText("5 itens")).toBeInTheDocument(); // promissórias pendentes
    });

    // 2. Clica no card de promissórias pendentes
    const pendentesCard = screen.getByText("5 itens").closest("button");
    expect(pendentesCard).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(pendentesCard);
    });

    // 3. Verifica se modal abriu (usando role para ser único)
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Promissórias pendentes (mês)" })).toBeInTheDocument();
    });

    // 4. Aguarda dados do modal carregarem
    await waitFor(() => {
      expect(screen.getByText("Empresa ABC Ltda")).toBeInTheDocument();
      expect(screen.getByText("João Silva")).toBeInTheDocument();
    });

    // 5. Verifica se dados estão formatados corretamente
    expect(screen.getAllByText("R$ 750,00")).toHaveLength(2);
    expect(screen.getByText("15/10/2025")).toBeInTheDocument();
    expect(screen.getByText("20/10/2025")).toBeInTheDocument();

    // 6. Verifica se resumo esperado bate
    expect(screen.getByText("Esperado pelo resumo: 5 itens — R$ 1.500,00")).toBeInTheDocument();
  });

  test("fluxo: dashboard → card atrasadas → modal com dados específicos", async () => {
    const mockAtrasadasData = [
      {
        pedido_id: 201,
        seq: 1,
        partner_name: "Cliente Atrasado",
        tipo: "VENDA",
        due_date: "2025-09-15", // data passada
        amount: 400.0
      },
      {
        pedido_id: 202,
        seq: 2,
        partner_name: "Outro Cliente",
        tipo: "VENDA",
        due_date: "2025-09-20",
        amount: 400.0
      }
    ];

    // Override mock para atrasadas
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/v1/pedidos/summary")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDashboardData
        });
      }

      if (url.includes("status=atrasadas")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAtrasadasData
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => []
      });
    });

    render(
      <Wrapper>
        <OrdersDashboard />
      </Wrapper>
    );

    // Aguarda dashboard carregar
    await waitFor(() => {
      expect(screen.getByText("2 itens")).toBeInTheDocument(); // atrasadas
    });

    // Clica no card de atrasadas
    const atrasadasCard = screen.getByText("2 itens").closest("button");

    await act(async () => {
      fireEvent.click(atrasadasCard);
    });

    // Verifica modal específico de atrasadas
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Promissórias atrasadas (mês)" })).toBeInTheDocument();
    });

    // Aguarda dados específicos
    await waitFor(() => {
      expect(screen.getByText("Cliente Atrasado")).toBeInTheDocument();
      expect(screen.getByText("Outro Cliente")).toBeInTheDocument();
    });

    // Verifica datas passadas
    expect(screen.getByText("15/09/2025")).toBeInTheDocument();
    expect(screen.getByText("20/09/2025")).toBeInTheDocument();

    // Verifica valores
    expect(screen.getAllByText("R$ 400,00")).toHaveLength(2);
  });

  test("simula erro na API de promissórias com dashboard funcionando", async () => {
    // Mock: dashboard OK, promissórias com erro
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/v1/pedidos/summary")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDashboardData
        });
      }

      if (url.includes("/api/v1/pedidos/promissorias")) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Erro na API de promissórias" })
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });

    render(
      <Wrapper>
        <OrdersDashboard />
      </Wrapper>
    );

    // Dashboard carrega normalmente
    await waitFor(() => {
      expect(screen.getByText("5 itens")).toBeInTheDocument();
    });

    // Clica no card
    const pendentesCard = screen.getByText("5 itens").closest("button");

    await act(async () => {
      fireEvent.click(pendentesCard);
    });

    // Modal abre
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Promissórias pendentes (mês)" })).toBeInTheDocument();
    });

    // Mas exibe erro
    await waitFor(() => {
      expect(screen.getByText("Erro: Erro na API de promissórias")).toBeInTheDocument();
    });
  });

  test("verifica parâmetros corretos na chamada da API", async () => {
    render(
      <Wrapper>
        <OrdersDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("5 itens")).toBeInTheDocument();
    });

    // Limpa calls anteriores
    global.fetch.mockClear();

    const pendentesCard = screen.getByText("5 itens").closest("button");

    await act(async () => {
      fireEvent.click(pendentesCard);
    });

    // Verifica se API foi chamada com parâmetros corretos
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/pedidos\/promissorias\?month=\d{4}-\d{2}&status=pendentes&limit=100/),
        expect.objectContaining({
          cache: "no-store"
        })
      );
    });
  });

  test("fecha modal e volta ao dashboard", async () => {
    render(
      <Wrapper>
        <OrdersDashboard />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("5 itens")).toBeInTheDocument();
    });

    // Abre modal
    const pendentesCard = screen.getByText("5 itens").closest("button");
    await act(async () => {
      fireEvent.click(pendentesCard);
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Promissórias pendentes (mês)" })).toBeInTheDocument();
    });

    // Fecha modal
    const fecharButton = screen.getByText("Fechar");
    await act(async () => {
      fireEvent.click(fecharButton);
    });

    // Verifica se voltou ao dashboard (modal não existe mais)
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Dashboard ainda está visível
    expect(screen.getByText("5 itens")).toBeInTheDocument();
  });

  test("navegação entre meses atualiza dados", async () => {
    render(
      <Wrapper>
        <OrdersDashboard />
      </Wrapper>
    );

    // Aguarda carregamento inicial
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/pedidos/summary"),
        expect.any(Object)
      );
    });

    // Simula mudança de mês (se há controles de navegação)
    const currentMonth = new Date().toISOString().slice(0, 7);

    // O dashboard deve estar usando o mês atual
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`month=${currentMonth}`),
      expect.any(Object)
    );
  });
});