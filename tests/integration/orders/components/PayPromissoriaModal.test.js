/**
 * @jest-environment jsdom
 */

import React from "react";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { renderAndFlush } from "tests/test-utils/renderAndFlush";
import { flushAsync } from "tests/test-utils/flushAsync";
import PayPromissoriaModal from "components/pedidos/orders/modals/PayPromissoriaModal";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";

// Teste focado do componente: valida título, campos e ações

global.fetch = jest.fn();

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("PayPromissoriaModal", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test("renderiza título, vencimento e confirma pagamento", async () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();

    // Mock da resposta de sucesso do POST
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    await renderAndFlush(
      <Wrapper>
        <PayPromissoriaModal
          pedidoId={123}
          seq={2}
          dueDate={"2025-10-15"}
          defaultPaidDate={"2025-10-16"}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </Wrapper>,
    );

    // Título e informações básicas
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/Marcar Pago • Parcela #2/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("15/10/2025")).toBeInTheDocument();

    // Botões e input de data
    const inputData = within(dialog).getByLabelText(/Data do Pagamento/i);
    expect(inputData).toHaveValue("2025-10-16");

    const confirmar = within(dialog).getByRole("button", {
      name: /Confirmar/i,
    });
    fireEvent.click(confirmar);

    // Aguarda microtasks de envio + callbacks
    await flushAsync(2);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/pedidos/123/promissorias/2?action=pay",
        expect.objectContaining({ method: "POST" }),
      );
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  test("Cancelar fecha o modal sem chamar API", () => {
    const onClose = jest.fn();

    render(
      <Wrapper>
        <PayPromissoriaModal
          pedidoId={123}
          seq={1}
          dueDate={null}
          defaultPaidDate={"2025-10-01"}
          onClose={onClose}
        />
      </Wrapper>,
    );

    const dialog = screen.getByRole("dialog");
    const cancelar = within(dialog).getByRole("button", { name: /Cancelar/i });
    fireEvent.click(cancelar);

    expect(onClose).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
