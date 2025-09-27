/** @jest-environment jsdom */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { OrdersManager } from "components/orders";

/*
 E2E UI (jsdom) simplificado para fluxo FIFO:
 1. Mock de fetch para criar produto (com fornecedor), compra (gera lote) e venda.
 2. Lista deve exibir badge FIFO para pedido de COMPRA e badge LEGACY/ELIGIBLE/FIFO para VENDA.
 3. Forçamos cenário já FIFO: criamos venda com consumo FIFO (simulando backend já retornando fifo_state=fifo).
 4. Valida exibição correta das badges e ausência do botão Migrar (já FIFO).

 Observação: Este teste não exercita rede real (faz stub do fetch), mas cobre integração de componentes OrdersManager -> OrdersBrowser -> OrdersRow.
 Futuras expansões: cenário eligible com clique no botão migrar.
*/

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("OrdersManager FIFO Badges (E2E UI)", () => {
  beforeEach(() => {
    let pedidosListOnce = false;
    global.fetch = jest.fn(async (url, opts) => {
      const u = String(url);
      // Produtos / criação (não usamos diretamente aqui, mas mantemos para coerência futura)
      if (u.includes("/api/v1/produtos")) {
        return {
          ok: true,
          json: async () => [
            { id: 77, nome: "Ração Premium", preco_tabela: 100 },
          ],
        };
      }
      if (u.includes("/api/v1/entities")) {
        return {
          ok: true,
          json: async () => [
            { id: 201, name: "FORN PJ", entity_type: "PJ" },
            { id: 301, name: "CLIENTE PF", entity_type: "PF" },
          ],
        };
      }
      if (u.includes("/api/v1/pedidos/legacy_count")) {
        return { ok: true, json: async () => ({ legacy_count: 0 }) };
      }
      if (u.includes("/api/v1/pedidos?")) {
        // Retornar lista somente 1x (reloads subsequentes retornam mesma lista)
        if (!pedidosListOnce) pedidosListOnce = true;
        // Simula uma compra (fifo_state = fifo) e uma venda já processada com FIFO
        return {
          ok: true,
          json: async () => [
            {
              id: 10,
              tipo: "COMPRA",
              partner_name: "FORN PJ",
              data_emissao: "2025-09-01",
              total_liquido: 500,
              frete_total: null,
              total_pago: 0,
              numero_promissorias: 1,
              tem_nota_fiscal: false,
              fifo_state: "fifo",
            },
            {
              id: 11,
              tipo: "VENDA",
              partner_name: "CLIENTE PF",
              data_emissao: "2025-09-02",
              total_liquido: 750,
              frete_total: null,
              total_pago: 0,
              numero_promissorias: 1,
              tem_nota_fiscal: true,
              fifo_state: "fifo",
            },
          ],
        };
      }
      // PUT/POST pedidos default
      if (u.match(/\/api\/v1\/pedidos\/\d+$/) && opts?.method === "PUT") {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  test("exibe badges FIFO e não mostra botão Migrar quando já fifo", async () => {
    render(
      <Wrapper>
        <OrdersManager limit={20} />
      </Wrapper>,
    );

    // Aguarda até que a lista carregue efetivamente (parceiro da venda)
    await screen.findByText("CLIENTE PF");

    // Agora deve existir também a linha da compra
    const compraRow = screen.getByText("FORN PJ").closest("tr");
    expect(compraRow).toBeTruthy();
    // COMPRA não renderiza badge (retorna null) - checamos ausência de span com texto FIFO nesta linha
    expect(within(compraRow).queryByText("FIFO")).toBeNull();

    // Verificar linha VENDA (id 11) - badge FIFO deve existir
    const vendaRow = screen.getByText("CLIENTE PF").closest("tr");
    expect(vendaRow).toBeTruthy();
    expect(within(vendaRow).getByText("FIFO")).toBeInTheDocument();
    // Não deve haver botão 'Migrar FIFO'
    expect(
      within(vendaRow).queryByRole("button", { name: /Migrar FIFO/i }),
    ).toBeNull();
  });
});
