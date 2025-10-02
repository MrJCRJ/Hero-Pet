import { renderHook, act } from "@testing-library/react";
import { usePedidoPromissorias } from "components/pedidos/usePedidoPromissorias";

function advanceEffects() {
  return new Promise((r) => setTimeout(r, 0));
}

describe("usePedidoPromissorias", () => {
  test("não gera cronograma com 1 parcela", async () => {
    const { result } = renderHook(() => usePedidoPromissorias(null));
    act(() => {
      result.current.setDataPrimeiraPromissoria("2025-01-10");
      result.current.setNumeroPromissorias(1);
    });
    await advanceEffects();
    expect(result.current.promissoriaDatas).toHaveLength(0);
  });

  test("gera mensal corretamente", async () => {
    const { result } = renderHook(() => usePedidoPromissorias(null));
    act(() => {
      result.current.setDataPrimeiraPromissoria("2025-01-10");
      result.current.setNumeroPromissorias(3);
      result.current.setFrequenciaPromissorias("mensal");
    });
    await advanceEffects();
    expect(result.current.promissoriaDatas).toEqual([
      "2025-01-10",
      "2025-02-10",
      "2025-03-10",
    ]);
  });

  test("gera quinzenal corretamente", async () => {
    const { result } = renderHook(() => usePedidoPromissorias(null));
    act(() => {
      result.current.setDataPrimeiraPromissoria("2025-01-01");
      result.current.setNumeroPromissorias(3);
      result.current.setFrequenciaPromissorias("quinzenal");
    });
    await advanceEffects();
    expect(result.current.promissoriaDatas).toEqual([
      "2025-01-01",
      "2025-01-16",
      "2025-01-31",
    ]);
  });

  test("gera semanal corretamente", async () => {
    const { result } = renderHook(() => usePedidoPromissorias(null));
    act(() => {
      result.current.setDataPrimeiraPromissoria("2025-03-05");
      result.current.setNumeroPromissorias(4);
      result.current.setFrequenciaPromissorias("semanal");
    });
    await advanceEffects();
    expect(result.current.promissoriaDatas).toEqual([
      "2025-03-05",
      "2025-03-12",
      "2025-03-19",
      "2025-03-26",
    ]);
  });

  test("gera por dias customizados", async () => {
    const { result } = renderHook(() => usePedidoPromissorias(null));
    act(() => {
      result.current.setDataPrimeiraPromissoria("2025-04-10");
      result.current.setNumeroPromissorias(3);
      result.current.setFrequenciaPromissorias("dias");
      result.current.setIntervaloDiasPromissorias(10);
    });
    await advanceEffects();
    expect(result.current.promissoriaDatas).toEqual([
      "2025-04-10",
      "2025-04-20",
      "2025-04-30",
    ]);
  });

  test("modo manual não gera automaticamente", async () => {
    const { result } = renderHook(() => usePedidoPromissorias(null));
    act(() => {
      result.current.setDataPrimeiraPromissoria("2025-05-01");
      result.current.setNumeroPromissorias(3);
      result.current.setFrequenciaPromissorias("manual");
    });
    await advanceEffects();
    expect(result.current.promissoriaDatas).toHaveLength(0);
  });
});
