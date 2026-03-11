/**
 * @jest-environment jsdom
 *
 * Testes TDD para páginas do App Router.
 * Valida que cada rota renderiza o componente correto.
 *
 * @see docs/MIGRATION_APP_ROUTER.md
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/entities/shared/toast";
import { HomePage } from "@/components/home";
import { EntitiesPage } from "@/app/(main)/entities/EntitiesPage";
import { ProductsPage } from "@/app/(main)/products/ProductsPage";
import { EstoquePageClient } from "@/app/(main)/estoque/EstoquePageClient";
import { OrdersPage } from "@/app/(main)/orders/OrdersPage";
import { ExpensesPage } from "@/app/(main)/expenses/ExpensesPage";

const mockSession = { user: { name: "Test" }, expires: "2025-12-31" };

function AppWrapper({ children }) {
  return (
    <SessionProvider session={mockSession}>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

describe("App Router - Páginas", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ data: [], meta: { total: 0 } }) }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("HomePage", () => {
    it("renderiza título Hero-Pet ou Sistema Hero-Pet quando autenticado", async () => {
      render(
        <AppWrapper>
          <HomePage />
        </AppWrapper>,
      );
      await screen.findByText(/Sistema Hero-Pet|Hero-Pet/);
      expect(screen.getByText(/Sistema Hero-Pet|Hero-Pet/)).toBeInTheDocument();
    });

    it("exibe links de navegação quando autenticado", async () => {
      render(
        <AppWrapper>
          <HomePage />
        </AppWrapper>,
      );
      expect(await screen.findByRole("link", { name: /Cliente \/ Fornecedor/ })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Produtos/ })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Pedidos/ })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Financeiro/ })).toBeInTheDocument();
    });
  });

  describe("EstoquePage", () => {
    it("renderiza EstoquePageClient com heading Estoque", async () => {
      fetch.mockImplementation((url) => {
        if (typeof url === "string" && url.includes("/api/v1/estoque/resumo")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });
      render(
        <AppWrapper>
          <EstoquePageClient />
        </AppWrapper>,
      );
      expect(await screen.findByRole("heading", { name: /Estoque/ })).toBeInTheDocument();
    });
  });

  describe("EntitiesPage", () => {
    it("renderiza EntitiesManager com heading Cliente / Fornecedor", async () => {
      render(
        <AppWrapper>
          <EntitiesPage />
        </AppWrapper>,
      );
      const headings = await screen.findAllByText(/Cliente \/ Fornecedor/);
      expect(headings.length).toBeGreaterThanOrEqual(1);
      expect(headings[0]).toBeInTheDocument();
    });
  });

  describe("ProductsPage", () => {
    it("renderiza ProductsManager com barra de busca", async () => {
      render(
        <AppWrapper>
          <ProductsPage />
        </AppWrapper>,
      );
      expect(await screen.findByPlaceholderText(/Buscar por nome/)).toBeInTheDocument();
    });
  });

  describe("OrdersPage", () => {
    it("renderiza PedidoListManager com heading Pedidos", async () => {
      fetch.mockImplementation((url) => {
        if (typeof url === "string" && url.includes("/api/v1/pedidos")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [], meta: { total: 0 } }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });
      render(
        <AppWrapper>
          <OrdersPage />
        </AppWrapper>,
      );
      expect(await screen.findByRole("heading", { name: /Pedidos/ })).toBeInTheDocument();
    });
  });

  describe("ExpensesPage", () => {
    it("renderiza DespesasManager com heading Despesas", async () => {
      fetch.mockImplementation((url) => {
        if (typeof url === "string" && url.includes("/api/v1/despesas")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: [], meta: { total: 0 } }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });
      render(
        <AppWrapper>
          <ExpensesPage />
        </AppWrapper>,
      );
      expect(await screen.findByRole("heading", { name: /Despesas/ })).toBeInTheDocument();
    });
  });
});
