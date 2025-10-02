/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { EntitiesManager } from "components/entities/form/EntitiesManager";

// Teste de edição de entidade: abre edição a partir da lista, altera nome e salva.

global.fetch = jest.fn();

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe("Entities UI - Edit", () => {
  beforeEach(() => {
    fetch.mockClear();
    const fakeEntities = [
      {
        id: 42,
        name: "FOO SUPRIMENTOS",
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

      if (
        url.includes("/api/v1/entities?") &&
        (!init || init.method === "GET")
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: fakeEntities, total: 1 }),
        });
      }
      if (
        /\/api\/v1\/entities\/42$/.test(url) &&
        (!init || init.method === "GET")
      ) {
        return Promise.resolve({ ok: true, json: async () => fakeEntities[0] });
      }
      if (
        /\/api\/v1\/entities\/42$/.test(url) &&
        init &&
        init.method === "PUT"
      ) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  test("edita entidade existente e salva", async () => {
    render(
      <Wrapper>
        <EntitiesManager highlightId={42} />
      </Wrapper>,
    );

    // Form deve abrir automaticamente pela prop highlightId
    expect(
      await screen.findByText(/Formulário de Cliente/),
    ).toBeInTheDocument();

    // Campo Nome (pode ser "Razão Social" para PJ)
    const nomeInput = screen.getByLabelText(/Razão Social|Nome/i);
    fireEvent.change(nomeInput, {
      target: { value: "FOO SUPRIMENTOS ALTERADO" },
    });

    // Submit (Atualizar... -> Atualizar)
    const submitBtn = screen.getByRole("button", {
      name: /Atualizar|Atualizando/i,
    });
    fireEvent.click(submitBtn);

    // Após salvar volta à lista (título de browser visível)
    await screen.findByText(/Cliente \/ Fornecedor/);
  });
});
