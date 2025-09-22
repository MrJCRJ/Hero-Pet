/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { PedidoForm } from "components/PedidoForm";

// Mock das funções que fazem fetch para as APIs
global.fetch = jest.fn();

// Mocks básicos para evitar erros de fetch em jsdom
const mockPartners = [
  { id: 1, label: "CLIENTE TESTE • PF", name: "CLIENTE TESTE" },
];
const mockProducts = [{ id: 1, label: "Produto Teste" }];

function ComponentWrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("PedidoForm Refatoração - Integração", () => {
  beforeEach(() => {
    fetch.mockClear();

    // Mock padrão para as chamadas de API
    fetch.mockImplementation((url) => {
      const u = String(url);
      if (u.includes("/api/v1/entities")) {
        // O componente espera um array simples
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPartners),
        });
      }
      if (u.includes("/api/v1/produtos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProducts),
        });
      }
      if (u.includes("/api/v1/estoque/saldos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ saldo: 10 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  test("deve renderizar sem crash e mostrar seções principais", async () => {
    render(
      <ComponentWrapper>
        <PedidoForm />
      </ComponentWrapper>,
    );

    // Header: rótulos básicos
    expect(screen.getByText("Tipo")).toBeInTheDocument();
    // Itens
    expect(screen.getByText("Itens")).toBeInTheDocument();
    expect(screen.getByText("+ Adicionar item")).toBeInTheDocument();
    // Promissórias (título da seção)
    expect(screen.getByText("Sistema de Promissórias")).toBeInTheDocument();
    // Ações
    expect(screen.getByText("Limpar")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Criar Pedido|Atualizar Pedido/i }),
    ).toBeInTheDocument();
  });

  test("deve alternar entre tipos VENDA e COMPRA", async () => {
    const user = userEvent.setup();

    render(
      <ComponentWrapper>
        <PedidoForm />
      </ComponentWrapper>,
    );
    const combo = screen.getByRole("combobox");
    // valor inicial VENDA
    expect(combo).toHaveValue("VENDA");
    await user.selectOptions(combo, "COMPRA");
    expect(combo).toHaveValue("COMPRA");
    await user.selectOptions(combo, "VENDA");
    expect(combo).toHaveValue("VENDA");
  });

  test("deve atualizar número de promissórias e recalcular valor", async () => {
    const user = userEvent.setup();

    render(
      <ComponentWrapper>
        <PedidoForm />
      </ComponentWrapper>,
    );
    // Ativar promissórias
    const chk = screen.getByLabelText("Parcelar em Promissórias");
    await user.click(chk);
    const numero = screen.getByLabelText("Número de Promissórias");
    await user.clear(numero);
    await user.type(numero, "3");
    expect(numero).toHaveValue(3);
  });

  test("deve mostrar seção de promissórias quando número > 1", async () => {
    const user = userEvent.setup();

    render(
      <ComponentWrapper>
        <PedidoForm />
      </ComponentWrapper>,
    );
    // Ativar promissórias e definir 2+
    await user.click(screen.getByLabelText("Parcelar em Promissórias"));
    const numero = screen.getByLabelText("Número de Promissórias");
    await user.clear(numero);
    await user.type(numero, "2");
    // Campo de data deve aparecer
    await waitFor(() => {
      expect(
        screen.getByLabelText("Data da 1ª Promissória"),
      ).toBeInTheDocument();
    });
  });

  test("deve manter estado consistente entre componentes modulares", async () => {
    const user = userEvent.setup();

    render(
      <ComponentWrapper>
        <PedidoForm />
      </ComponentWrapper>,
    );

    // Alterar tipo via combobox
    const combo = screen.getByRole("combobox");
    await user.selectOptions(combo, "COMPRA");
    expect(combo).toHaveValue("COMPRA");

    // Ativar promissórias e ajustar número
    await user.click(screen.getByLabelText("Parcelar em Promissórias"));
    const numero = screen.getByLabelText("Número de Promissórias");
    await user.clear(numero);
    await user.type(numero, "4");
    expect(numero).toHaveValue(4);
  });

  test("deve exibir campos de data quando há promissórias múltiplas", async () => {
    const user = userEvent.setup();

    render(
      <ComponentWrapper>
        <PedidoForm />
      </ComponentWrapper>,
    );

    await user.click(screen.getByLabelText("Parcelar em Promissórias"));
    const numero = screen.getByLabelText("Número de Promissórias");
    await user.clear(numero);
    await user.type(numero, "3");
    await waitFor(() => {
      expect(
        screen.getByLabelText("Data da 1ª Promissória"),
      ).toBeInTheDocument();
    });
    const dataInput = screen.getByLabelText("Data da 1ª Promissória");
    await user.clear(dataInput);
    await user.type(dataInput, "2024-12-31");
    expect(dataInput).toHaveValue("2024-12-31");
  });

  test("cronograma: travar manual e mostrar inputs + badge PAGO + confirmar ao editar paga", async () => {
    const user = userEvent.setup();

    const editingOrder = {
      id: 123,
      tipo: "VENDA",
      parcelado: true,
      numero_promissorias: 3,
      data_primeira_promissoria: "2025-10-01",
      status: "confirmado",
      itens: [],
      promissorias: [
        {
          seq: 1,
          due_date: "2025-10-01",
          amount: "100.00",
          paid_at: "2025-10-05",
        },
        { seq: 2, due_date: "2000-01-01", amount: "100.00", paid_at: null }, // atrasado
        { seq: 3, due_date: "2099-12-31", amount: "100.00", paid_at: null },
      ],
    };

    render(
      <ComponentWrapper>
        <PedidoForm editingOrder={editingOrder} />
      </ComponentWrapper>,
    );

    // Seção de cronograma deve existir e mostrar badges
    expect(screen.getByText("Cronograma de Vencimentos")).toBeInTheDocument();
    expect(screen.getAllByText("PAGO")[0]).toBeInTheDocument();
    expect(screen.getAllByText("ATRASADO")[0]).toBeInTheDocument();

    // Travar manual usando o botão
    const lockBtn = screen.getByRole("button", {
      name: /Usar cronograma manual atual/i,
    });
    await user.click(lockBtn);

    // Deve haver inputs de data preenchidos com as 3 datas
    await waitFor(() => {
      expect(screen.getAllByDisplayValue("2025-10-01").length).toBeGreaterThan(
        0,
      );
      expect(screen.getAllByDisplayValue("2000-01-01").length).toBeGreaterThan(
        0,
      );
      expect(screen.getAllByDisplayValue("2099-12-31").length).toBeGreaterThan(
        0,
      );
    });

    // Ao tentar editar a 1ª (paga), deve exibir alerta informativo (sem bloquear)
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    const paidInput = screen.getAllByDisplayValue("2025-10-01")[0];
    await user.clear(paidInput);
    await user.type(paidInput, "2025-10-10");
    expect(alertSpy).toHaveBeenCalled();
    // A alteração deve persistir mesmo sendo parcela paga
    expect(paidInput).toHaveValue("2025-10-10");

    // Edição subsequente continua permitida
    await user.clear(paidInput);
    await user.type(paidInput, "2025-10-15");
    expect(paidInput).toHaveValue("2025-10-15");
    alertSpy.mockRestore();
  });
});
