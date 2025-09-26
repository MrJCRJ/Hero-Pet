/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "contexts/ThemeContext";
import { ProductsManager } from "components/products/manager";

function Wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("ProductsManager detalhes produto", () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      const u = String(url);
      if (u.startsWith("/api/v1/produtos?")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 1,
                nome: "Ração Premium",
                categoria: "Racao",
                ativo: true,
                supplier_labels: [],
                preco_tabela: 100,
              },
            ]),
        });
      }
      if (u.includes("/custos_historicos")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { month: "2025-06", avg_cost: 32.5 },
              { month: "2025-07", avg_cost: 35.1 },
              { month: "2025-08", avg_cost: 34.0 },
              { month: "2025-09", avg_cost: 36.2 },
            ]),
        });
      }
      if (u.includes("/estoque/movimentos")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (u.includes("/estoque/saldos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ saldo: 10 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  test("abre modal ações e exibe gráfico de histórico ao clicar em Detalhes", async () => {
    render(
      <Wrapper>
        <ProductsManager />
      </Wrapper>,
    );

    // Aguarda produto carregar
    await waitFor(() => {
      expect(screen.getByText("Ração Premium")).toBeInTheDocument();
    });

    const row = screen.getByText("Ração Premium");
    const user = userEvent.setup();
    await user.click(row); // abre modal ações

    await waitFor(() => {
      expect(screen.getByText(/Escolha uma ação/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Detalhes" }));

    await waitFor(() => {
      // Checa presença de um mês do histórico e label Min/Max
      expect(screen.getByText("2025-09")).toBeInTheDocument();
      expect(screen.getByText(/Min/)).toBeInTheDocument();
    });
  });
});
