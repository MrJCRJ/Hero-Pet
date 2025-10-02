/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import {
  useMonthState,
  useDashboardData,
} from "components/pedidos/orders/shared/hooks";

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn();

describe("Orders Hooks", () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    fetch.mockClear();
  });

  describe("useMonthState", () => {
    test("inicializa com mês atual se não há valor no localStorage", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useMonthState());

      // Verifica se inicializa com mês atual no formato YYYY-MM
      expect(result.current.month).toMatch(/^\d{4}-\d{2}$/);
    });

    test("inicializa com valor do localStorage se existir", () => {
      localStorageMock.getItem.mockReturnValue("2024-03");

      const { result } = renderHook(() => useMonthState());

      expect(result.current.month).toBe("2024-03");
    });

    test("persiste mudanças no localStorage", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useMonthState());

      act(() => {
        result.current.setMonth("2024-05");
      });

      expect(result.current.month).toBe("2024-05");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "orders:month",
        "2024-05",
      );
    });

    test("aceita prop monthProp como valor inicial", () => {
      const { result } = renderHook(() => useMonthState("2024-07"));

      expect(result.current.month).toBe("2024-07");
    });

    test("atualiza quando monthProp muda", () => {
      const { result, rerender } = renderHook(
        ({ monthProp }) => useMonthState(monthProp),
        { initialProps: { monthProp: "2024-01" } },
      );

      expect(result.current.month).toBe("2024-01");

      rerender({ monthProp: "2024-02" });

      expect(result.current.month).toBe("2024-02");
    });
  });

  describe("useDashboardData", () => {
    const mockData = {
      vendasMes: 1000,
      comprasMes: 800,
      lucroBruto: 200,
      promissorias: [{ seq: 1, valor: 100, vencimento: "2024-03-15" }],
    };

    test("carrega dados quando month é fornecido", async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useDashboardData("202403"));

      // Aguarda o efeito executar
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/pedidos/summary?month=202403",
        { cache: "no-store" },
      );
      expect(result.current.data).toEqual(mockData);
      expect(result.current.loading).toBe(false);
    });

    test("faz chamada sem parâmetro quando month não é fornecido", async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      renderHook(() => useDashboardData(""));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetch).toHaveBeenCalledWith("/api/v1/pedidos/summary", {
        cache: "no-store",
      });
    });

    test("gerencia estado de loading", () => {
      fetch.mockImplementation(() => new Promise(() => {})); // Promise que nunca resolve

      const { result } = renderHook(() => useDashboardData("202403"));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
    });

    test("gerencia erros de API", async () => {
      fetch.mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useDashboardData("202403"));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe("API Error");
    });

    test("gerencia resposta não ok da API", async () => {
      fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server Error" }),
      });

      const { result } = renderHook(() => useDashboardData("202403"));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe("Server Error");
    });

    test("valida formato dos dados antes de definir", async () => {
      // Mock dados que não passam na validação
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: "data" }),
      });

      const { result } = renderHook(() => useDashboardData("202403"));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Dados inválidos não são definidos
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });
});
