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

describe("ProductsManager gráfico de histórico de custos", () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      const u = String(url);
      if (u.startsWith("/api/v1/produtos?")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 11,
                nome: "TEST FIFO",
                categoria: "Teste",
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
            Promise.resolve({
              data: [
                { month: "2025-06", avg_cost: 10 },
                { month: "2025-07", avg_cost: 14 },
                { month: "2025-08", avg_cost: 14 },
                { month: "2025-09", avg_cost: 18.8 },
              ],
              meta: { months: 12 },
            }),
        });
      }
      if (u.includes("/estoque/movimentos")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (u.includes("/estoque/saldos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ saldo: 0 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  test("exibe variação, tooltip e linhas do gráfico", async () => {
    render(
      <Wrapper>
        <ProductsManager />
      </Wrapper>,
    );

    await waitFor(() =>
      expect(screen.getByText("TEST FIFO")).toBeInTheDocument(),
    );

    const user = userEvent.setup();
    await user.click(screen.getByText("TEST FIFO"));
    await waitFor(() => screen.getByText(/Escolha uma ação/));
    await user.click(screen.getByRole("button", { name: "Detalhes" }));

    // Novo layout: painel lateral com labels 'Mês', 'Custo Médio', 'Var. Mês→Mês', 'Var. Acumulada'
    expect(screen.getByText("Mês")).toBeInTheDocument();
    expect(screen.getByText("Custo Médio")).toBeInTheDocument();
    expect(screen.getByText("Var. Mês→Mês")).toBeInTheDocument();
    expect(screen.getByText("Var. Acumulada")).toBeInTheDocument();

    // Último mês aparece nos dados (tooltip/painel mostra label final quando sem hover)
    expect(screen.getByText("2025-09")).toBeInTheDocument();

    // Verifica variação acumulada total e primeira variação mês a mês
    const acumuladas = screen.getAllByText(/\+88\.0%/);
    expect(acumuladas.length).toBeGreaterThan(0);
    // Variação mês→mês é exibida apenas quando há um ponto anterior focado.
    // Vamos tentar hover em 2025-09 (último) para garantir cálculo com base em 2025-08.
    const lastMonth = screen.getByText("2025-09");
    await user.hover(lastMonth);
    // Esperado: de 14.0 (Ago) para 18.8 (Set) => +34.3%
    const momCandidates = [
      ...screen.queryAllByText(/\+34\.3%/),
      ...screen.queryAllByText(/\+34,3%/),
    ];
    expect(momCandidates.length).toBeGreaterThan(0);

    // Hover no label do mês (09) para mostrar tooltip com valor formatado
    const monthLabel = screen
      .getAllByText("09")
      .find((el) => el.textContent === "09");
    if (monthLabel) await user.hover(monthLabel);
  });
});
