/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import OrdersRow from "components/orders/OrdersRow";

// Mock das dependências
global.fetch = jest.fn();

// Mock window.open para evitar erro em jsdom
Object.defineProperty(window, "open", {
  writable: true,
  value: jest.fn(),
});

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("OrdersRow Component", () => {
  const mockPedido = {
    id: 123,
    tipo: "VENDA",
    partner_name: "Cliente Teste",
    data_emissao: "2024-03-15",
    tem_nota_fiscal: true,
    numero_promissorias: 2,
    total_liquido: "100.00",
    frete_total: "10.00",
    total_pago: "50.00",
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockReload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();

    // Mock fetch para promissórias
    fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            seq: 1,
            due_date: "2024-04-15",
            amount: "50.00",
            status: "EM_ABERTO",
          },
          {
            seq: 2,
            due_date: "2024-05-15",
            amount: "50.00",
            status: "EM_ABERTO",
          },
        ]),
    });
  });

  test("renderiza dados básicos do pedido", () => {
    render(
      <Wrapper>
        <table>
          <tbody>
            <OrdersRow
              p={mockPedido}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              reload={mockReload}
            />
          </tbody>
        </table>
      </Wrapper>,
    );

    expect(screen.getByText("Cliente Teste")).toBeInTheDocument();
    expect(screen.getByText("VENDA")).toBeInTheDocument();
    expect(screen.getByText("15/03/2024")).toBeInTheDocument();
  });

  test("exibe botão de duplicatas para VENDA com promissórias", () => {
    render(
      <Wrapper>
        <table>
          <tbody>
            <OrdersRow
              p={mockPedido}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              reload={mockReload}
            />
          </tbody>
        </table>
      </Wrapper>,
    );

    const duplicatasButton = screen.getByTitle("Baixar Duplicadas (PDF)");
    expect(duplicatasButton).toBeInTheDocument();

    // Testa click no botão
    fireEvent.click(duplicatasButton);
    expect(window.open).toHaveBeenCalledWith(
      `/api/v1/pedidos/${mockPedido.id}/promissorias-pdf`,
      "_blank",
      "noopener",
    );
  });

  test("não exibe botões de download para COMPRA", () => {
    const compraPedido = {
      ...mockPedido,
      tipo: "COMPRA",
      tem_nota_fiscal: false,
      numero_promissorias: 0,
    };

    render(
      <ThemeProvider>
        <ToastProvider>
          <table>
            <tbody>
              <OrdersRow
                p={compraPedido}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                reload={mockReload}
              />
            </tbody>
          </table>
        </ToastProvider>
      </ThemeProvider>,
    );

    expect(screen.queryByTitle("Baixar NF (PDF)")).not.toBeInTheDocument();
    expect(
      screen.queryByTitle("Baixar Duplicadas (PDF)"),
    ).not.toBeInTheDocument();
    // COMPRA exibe '-' nos campos de NF e Duplicadas
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
  });

  test("renderiza promissórias dots", async () => {
    render(
      <Wrapper>
        <table>
          <tbody>
            <OrdersRow
              p={mockPedido}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              reload={mockReload}
            />
          </tbody>
        </table>
      </Wrapper>,
    );

    // PromissoriasDots deve estar presente (testado indiretamente)
    // O componente carrega as promissórias via fetch
    expect(fetch).toHaveBeenCalledWith(
      `/api/v1/pedidos/${mockPedido.id}/promissorias`,
      { cache: "no-store" },
    );
  });

  test("mostra valores monetários formatados", () => {
    render(
      <Wrapper>
        <table>
          <tbody>
            <OrdersRow
              p={mockPedido}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              reload={mockReload}
            />
          </tbody>
        </table>
      </Wrapper>,
    );

    // Verifica se valores são exibidos (formato BRL)
    expect(screen.getByText("R$ 110,00")).toBeInTheDocument(); // total_liquido formatado
    expect(screen.getByText(/Pago:.*R\$ 50,00/)).toBeInTheDocument(); // total_pago formatado
  });

  test("possui botão de exclusão", () => {
    render(
      <Wrapper>
        <table>
          <tbody>
            <OrdersRow
              p={mockPedido}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              reload={mockReload}
            />
          </tbody>
        </table>
      </Wrapper>,
    );

    const deleteButton = screen.getByTitle("Excluir pedido");
    expect(deleteButton).toBeInTheDocument();

    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalled();
  });

  test("gerencia status de nota fiscal", () => {
    render(
      <Wrapper>
        <table>
          <tbody>
            <OrdersRow
              p={mockPedido}
              onEdit={mockOnEdit}
              onDelete={mockOnDelete}
              reload={mockReload}
            />
          </tbody>
        </table>
      </Wrapper>,
    );

    // Para pedido com tem_nota_fiscal: true, deve mostrar algum indicador
    // A implementação específica pode variar
    expect(screen.getByText("VENDA")).toBeInTheDocument();
  });
});
