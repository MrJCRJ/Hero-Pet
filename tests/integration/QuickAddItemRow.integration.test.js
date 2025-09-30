import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PedidoFormView } from "components/pedido/PedidoFormView";
import { usePedidoFormController } from "components/pedido/usePedidoFormController";
import { ToastProvider } from "components/entities/shared/toast";
import { ThemeProvider } from "contexts/ThemeContext";

// Wrapper simples para montar o formulário mínimo focado em itens
function InnerPedidoForm() {
  const controller = usePedidoFormController({ editingOrder: null });
  return (
    <PedidoFormView
      {...controller}
      handleSubmit={(e) => e.preventDefault()}
      handleDelete={() => {}}
      fetchEntities={async () => ({ results: [] })}
      // SelectionModal espera um array simples
      fetchProdutos={async () => [{ id: 1, label: "Ração Premium" }]}
      fetchSaldoService={async () => 10}
      getItemChanges={() => ({ removed: [], added: [], updated: [] })}
      getItemDiffClass={() => ""}
      getItemDiffIcon={() => null}
      originalItens={[]}
      editingOrder={null}
      fifoAplicado={true}
      computeItemTotal={(it) => {
        const qtd = Number(it.quantidade);
        const preco =
          Number(it.preco_unitario) - Number(it.desconto_unitario || 0);
        if (!Number.isFinite(qtd) || !Number.isFinite(preco)) return null;
        return qtd * preco;
      }}
      computeOrderTotalEstimate={() => 0}
    />
  );
}

function TestPedidoForm() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <InnerPedidoForm />
      </ToastProvider>
    </ThemeProvider>
  );
}

describe("QuickAddItemRow integração básica", () => {
  test("adiciona item e aparece na tabela", async () => {
    render(<TestPedidoForm />);

    // Abrir seleção de produto
    const btnProduto = screen.getByRole("button", {
      name: /selecionar produto/i,
    });
    fireEvent.click(btnProduto);

    // Selecionar produto simulado
    const option = await screen.findByText(/ração premium/i);
    fireEvent.click(option);

    // Preencher quantidade
    const qtdInput = screen.getByLabelText(/quantidade/i);
    fireEvent.change(qtdInput, { target: { value: "2" } });

    // Preço unitário
    const precoInput = screen.getByLabelText(/preço unitário/i);
    fireEvent.change(precoInput, { target: { value: "10" } });

    // Adicionar
    const addBtn = screen.getByRole("button", { name: /adicionar item/i });
    fireEvent.click(addBtn);

    // Espera aparecer na tabela o total calculado (2 * 10 = 20)
    await waitFor(() => {
      expect(screen.getAllByText(/R\$\s*10/).length).toBeGreaterThan(0); // preço unit
      expect(screen.getByText(/R\$\s*20/)).toBeInTheDocument(); // total
    });
  });
});
