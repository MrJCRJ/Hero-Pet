/**
 * Smoke da página /relatorios: troca de abas dispara os fetches esperados sem erro.
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RelatoriosPage from "@/app/(main)/relatorios/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

const emptyDre = {
  receitas: 0,
  custosVendas: 0,
  lucroBruto: 0,
  despesas: 0,
  lucroOperacional: 0,
  margemBruta: 0,
  margemOperacional: 0,
  margemEbitda: 0,
  impostos: 0,
};

const emptyFluxo = {
  entradas: { total: 0 },
  saidas: { total: 0 },
  saldo: 0,
  saldoInicial: 0,
  saldoFinal: 0,
  fluxoOperacional: 0,
  fluxoFinanciamento: 0,
  fluxoInvestimento: 0,
  valorEstoque: 0,
  valorPresumidoVendaEstoque: 0,
  evolucaoMensal: [],
};

function mockFetch() {
  return jest.fn((input: RequestInfo | URL) => {
    const u = String(input);
    if (u.includes("/api/v1/pedidos/summary")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            vendasMes: 0,
            growthHistory: [],
            comprasHistory: [],
          }),
      } as Response);
    }
    if (u.includes("/api/v1/relatorios/consolidado")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ alertas: [] }),
      } as Response);
    }
    if (u.includes("/api/v1/relatorios/dre")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            dre: emptyDre,
            periodo: { mes: 1, ano: 2025, firstDay: "2025-01-01", lastDay: "2025-02-01" },
          }),
      } as Response);
    }
    if (u.includes("/api/v1/relatorios/fluxo-caixa")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ fluxo: emptyFluxo }),
      } as Response);
    }
    if (u.includes("/api/v1/relatorios/margem-produto")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ itens: [], totalReceita: 0 }),
      } as Response);
    }
    if (u.includes("/api/v1/relatorios/ranking")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            tipo: "vendas",
            ranking: [],
            totalGeral: 0,
            totalPedidosGeral: 0,
            ticketMedioGeral: 0,
            periodo: { mes: 1, ano: 2025 },
          }),
      } as Response);
    }
    if (u.includes("/api/v1/produtos/top")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ top: [], history: [], meta: {} }),
      } as Response);
    }
    if (u.includes("/api/v1/relatorios/indicadores")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            indicadores: {
              pmr: { valor: null },
              pmp: { valor: null },
              giroEstoque: { valor: null },
              dve: { valor: null },
            },
          }),
      } as Response);
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    } as Response);
  });
}

describe("RelatoriosPage — smoke troca de abas", () => {
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    fetchSpy = mockFetch();
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("carrega Resumo e permite alternar DRE, Fluxo, Margem, Ranking, Top Lucro sem erro", async () => {
    render(<RelatoriosPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    expect(
      fetchSpy.mock.calls.some((c) =>
        String(c[0]).includes("/api/v1/pedidos/summary"),
      ),
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /DRE/i }));
    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some((c) =>
          String(c[0]).includes("/api/v1/relatorios/dre"),
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /Fluxo de Caixa/i }));
    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some((c) =>
          String(c[0]).includes("/api/v1/relatorios/fluxo-caixa"),
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /Margem por Produto/i }));
    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some((c) =>
          String(c[0]).includes("/api/v1/relatorios/margem-produto"),
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /Ranking Vendas/i }));
    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some((c) =>
          String(c[0]).includes("/api/v1/relatorios/ranking"),
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /Top Lucro/i }));
    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some((c) =>
          String(c[0]).includes("/api/v1/produtos/top"),
        ),
      ).toBe(true);
    });

    expect(screen.queryByText(/Erro ao carregar/i)).toBeNull();
  });

  test("aba Histórico Custo não dispara fetch de relatório agregado", async () => {
    render(<RelatoriosPage />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const callsBefore = fetchSpy.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /Histórico Custo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Selecione um produto/i)).toBeInTheDocument();
    });

    const newCalls = fetchSpy.mock.calls.slice(callsBefore);
    const agregados = newCalls.filter(
      (c) =>
        String(c[0]).includes("/relatorios/dre") ||
        String(c[0]).includes("/relatorios/fluxo") ||
        String(c[0]).includes("/pedidos/summary"),
    );
    expect(agregados.length).toBe(0);
  });
});
