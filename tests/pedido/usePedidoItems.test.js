import { renderHook, act } from '@testing-library/react';
import { usePedidoItems } from 'components/pedidos/usePedidoItems';

// Mock util dependências se necessário (aqui usamos implementação real)

describe('usePedidoItems', () => {
  test('inicializa com item vazio quando sem editingOrder', () => {
    const { result } = renderHook(() => usePedidoItems(null));
    expect(result.current.itens).toHaveLength(1);
    expect(result.current.itens[0]).toHaveProperty('produto_id', '');
  });

  test('hidrata itens ao receber editingOrder', () => {
    const editing = { itens: [{ produto_id: 10, quantidade: 2, preco_unitario: 5 }] };
    const { result, rerender } = renderHook(({ order }) => usePedidoItems(order), { initialProps: { order: null } });
    expect(result.current.itens).toHaveLength(1); // vazio inicial
    rerender({ order: editing });
    expect(result.current.itens).toHaveLength(1);
    expect(String(result.current.itens[0].produto_id)).toBe('10');
    expect(result.current.originalItens).toHaveLength(1);
  });

  test('add, update e remove item', () => {
    const { result } = renderHook(() => usePedidoItems(null));
    act(() => { result.current.addItem({ produto_id: 1, quantidade: 3 }); });
    expect(result.current.itens).toHaveLength(2);
    act(() => { result.current.updateItem(1, { quantidade: 5 }); });
    expect(result.current.itens[1].quantidade).toBe(5);
    act(() => { result.current.removeItem(0); });
    expect(result.current.itens).toHaveLength(1);
    expect(result.current.itens[0].produto_id).toBe(1);
  });

  test('computeItemTotal utiliza preco - desconto', () => {
    const { result } = renderHook(() => usePedidoItems(null));
    act(() => {
      result.current.updateItem(0, { quantidade: 2, preco_unitario: 10, desconto_unitario: 1 });
    });
    const total = result.current.computeItemTotal(result.current.itens[0]);
    expect(total).toBeCloseTo(18); // (10-1)*2
  });
});
