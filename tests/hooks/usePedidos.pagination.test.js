import { renderHook, act } from '@testing-library/react';
import { usePedidos } from 'components/orders/shared/hooks';

// Mock global fetch
function makePage({ data, total }) {
  return { data, meta: { total } };
}

describe('usePedidos pagination', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('loads first page and advances to next when hasMore', async () => {
    const page1 = makePage({ data: Array.from({ length: 3 }).map((_, i) => ({ id: i + 1 })), total: 5 });
    const page2 = makePage({ data: [{ id: 4 }, { id: 5 }], total: 5 });
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, json: async () => page2 });
    global.fetch = fetchMock;

    const { result, waitForNextUpdate } = renderHook(() => usePedidos({ tipo: '', q: '', from: '', to: '' }, 3));

    // primeira chamada
    await waitForNextUpdate();
    expect(result.current.data).toHaveLength(3);
    expect(result.current.total).toBe(5);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.nextPage());

    await waitForNextUpdate();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.page).toBe(1);
    expect(result.current.data.map(r => r.id)).toEqual([4, 5]);
    expect(result.current.hasMore).toBe(false);
  });

  test('reset page when filters change', async () => {
    const page1 = makePage({ data: [{ id: 10 }], total: 1 });
    const pageFilter = makePage({ data: [{ id: 99 }], total: 1 });
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => page1 })
      .mockResolvedValueOnce({ ok: true, json: async () => pageFilter });
    global.fetch = fetchMock;

    const { result, waitForNextUpdate, rerender } = renderHook(({ f }) => usePedidos(f, 1), {
      initialProps: { f: { tipo: '', q: '', from: '', to: '' } }
    });
    await waitForNextUpdate();
    expect(result.current.page).toBe(0);
    act(() => result.current.nextPage()); // tentaria ir p/ page 1 (mas não tem mais)
    expect(result.current.page).toBe(1); // estado interno muda antes do fetch

    // aplicar novo filtro -> deve resetar page para 0
    rerender({ f: { tipo: 'VENDA', q: '', from: '', to: '' } });
    await waitForNextUpdate();
    expect(result.current.page).toBe(0);
    expect(result.current.data[0].id).toBe(99);
  });
});
