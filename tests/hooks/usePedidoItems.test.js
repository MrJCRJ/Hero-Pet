import { renderHook, act } from "@testing-library/react";
import { usePedidoItems } from "components/pedidos/usePedidoItems";

describe("usePedidoItems", () => {
  it("inicializa com item vazio quando sem editingOrder", () => {
    const { result } = renderHook(() => usePedidoItems(null));
    expect(result.current.itens.length).toBe(1);
    expect(result.current.totalBruto).toBe(0);
    expect(result.current.totalLiquido).toBe(0);
  });

  it("add/update/remove item e recalcula totais", () => {
    const { result } = renderHook(() => usePedidoItems(null));
    // adicionar item com qty 2 preço 10 desconto 1
    act(() => {
      result.current.addItem({
        produto_id: 1,
        quantidade: 2,
        preco_unitario: 10,
        desconto_unitario: 1,
      });
    });
    expect(result.current.itens.length).toBe(2); // item vazio + novo
    // totalBruto = 2*10 = 20; totalDescontos = 2*1 =2
    expect(result.current.totalBruto).toBe(20);
    expect(result.current.totalDescontos).toBe(2);
    expect(result.current.totalLiquido).toBe(18);

    // atualizar item: aumentar quantidade
    act(() => {
      result.current.updateItem(1, { quantidade: 3 });
    });
    expect(result.current.totalBruto).toBe(30);
    expect(result.current.totalDescontos).toBe(3);
    expect(result.current.totalLiquido).toBe(27);

    // remover item
    act(() => {
      result.current.removeItem(1);
    });
    // volta para apenas item vazio
    expect(result.current.itens.length).toBe(1);
    expect(result.current.totalBruto).toBe(0);
    expect(result.current.totalLiquido).toBe(0);
  });
});
