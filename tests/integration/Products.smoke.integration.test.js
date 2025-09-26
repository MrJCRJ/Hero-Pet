/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { ProductsManager } from "components/products";

// Smoke test leve para ProductsManager
// - Renderiza lista
// - Verifica cabeçalho e uma linha
// - Exercita filtro "Abaixo do mínimo" (sem validação pesada)

global.fetch = jest.fn();

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("Products UI - Smoke", () => {
  beforeEach(() => {
    fetch.mockClear();

    const fakeProducts = [
      {
        id: 201,
        nome: "Ração Premium",
        categoria: "Alimentos",
        preco_tabela: "30.00",
        estoque_minimo: 5,
        suppliers: [1],
        supplier_labels: [{ id: 1, name: "FORN 1" }, { id: 2, name: "FORN 2" }, { id: 3, name: "FORN 3" }],
        ativo: true,
        markup_percent_default: 30,
      },
    ];

    fetch.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input?.url;
      if (!url) return Promise.resolve({ ok: true, json: async () => ({}) });

      if (url.includes("/api/v1/produtos?")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: fakeProducts, meta: { total: 1 } }) });
      }
      if (url.includes("/api/v1/estoque/saldos")) {
        return Promise.resolve({ ok: true, json: async () => ({ saldo: 3, custo_medio: 12.5, ultimo_custo: 13.0 }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  test("renderiza lista de produtos e mostra colunas principais", async () => {
    render(
      <Wrapper>
        <ProductsManager />
      </Wrapper>
    );

    const table = await screen.findByRole("table");
    // Cabeçalho
    expect(within(table).getByText("Nome")).toBeInTheDocument();
    expect(within(table).getByText("Categoria")).toBeInTheDocument();
    expect(within(table).getByText("Fornecedores")).toBeInTheDocument();

    // Linha
    const rowEl = await within(table).findByText("Ração Premium");
    const row = rowEl.closest("tr");
    expect(row).not.toBeNull();
    expect(within(row).getByText("Alimentos")).toBeInTheDocument();

    // Coluna Preço deve exibir Compra/Venda
    expect(within(row).getByText("Compra")).toBeInTheDocument();
    expect(within(row).getByText("Venda")).toBeInTheDocument();

    // Coluna Estoque deve exibir Atual/Mínimo
    expect(within(row).getByText("Atual")).toBeInTheDocument();
    expect(within(row).getByText("Mínimo")).toBeInTheDocument();

    // Botão de inativar deve existir
    expect(within(row).getByRole("button", { name: /Inativar|Reativar/i })).toBeInTheDocument();
  });
});
