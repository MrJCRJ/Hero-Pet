/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { EntitiesManager } from "components/entities/form/EntitiesManager";

// Smoke Entities
// - Renderiza browser inicial
// - Clica em Adicionar abre formulário
// - Preenche nome + documento parcial e envia (mock POST ok)
// - Volta para lista sem quebrar

global.fetch = jest.fn();

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("Entities UI - Smoke", () => {
  beforeEach(() => {
    fetch.mockClear();
    const fakeEntities = [
      {
        id: 11,
        name: "ACME LTDA",
        entity_type: "PJ",
        document_digits: "12345678000190",
        document_status: "valid",
        document_pending: false,
        ativo: true,
      },
    ];

    fetch.mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input?.url;
      if (!url) return Promise.resolve({ ok: true, json: async () => ({}) });

      if (url.includes("/api/v1/entities?") || url.endsWith("/api/v1/entities")) {
        if (init && init.method === "POST") {
          return Promise.resolve({ ok: true, json: async () => ({ id: 99 }) });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: fakeEntities, meta: { total: 1 } }),
        });
      }
      if (/\/api\/v1\/entities\/(\d+)$/.test(url) && (!init || init.method === "GET")) {
        return Promise.resolve({ ok: true, json: async () => fakeEntities[0] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  test("lista, abre formulário e salva com sucesso", async () => {
    render(
      <Wrapper>
        <EntitiesManager />
      </Wrapper>
    );

    // Lista inicial
    const heading = await screen.findByText(/Cliente \/ Fornecedor/);
    expect(heading).toBeInTheDocument();

    const browserTable = await screen.findByRole("table");
    expect(within(browserTable).getByText("ACME LTDA")).toBeInTheDocument();

    // Abrir formulário
    fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));

    expect(await screen.findByText(/Formulário de Cliente/)).toBeInTheDocument();

    // Preenche nome e documento parcial (marcando pendente para permitir salvar)
    const nomeInput = screen.getByLabelText(/Nome/i);
    fireEvent.change(nomeInput, { target: { value: "Fulano Test" } });

    // Campo de documento é rotulado dinamicamente como CPF ou CNPJ
    const docInput = screen.getByLabelText(/CPF|CNPJ/i);
    fireEvent.change(docInput, { target: { value: "1234567890" } });

    // Marcar como pendente para não exigir dígitos completos
    const pendenteCheckbox = screen.getByLabelText(/Documento ainda não disponível/i);
    fireEvent.click(pendenteCheckbox);

    // Submete
    fireEvent.click(screen.getByRole("button", { name: /Salvar|Atualizar/i }));

    // Após POST bem-sucedido deve voltar para browser (título lista presente de novo)
    // Espera reexibir modo browser (botão Adicionar visível novamente)
    const addButton = await screen.findByRole("button", { name: /Adicionar/i });
    expect(addButton).toBeInTheDocument();
  });
});
