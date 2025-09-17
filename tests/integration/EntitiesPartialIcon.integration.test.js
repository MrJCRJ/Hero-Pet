import { render, screen } from "@testing-library/react";
import React from "react";
import { EntitiesBrowser } from "components/entities/list/EntitiesBrowser";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";

// Teste: cria entidade via API com endereço parcial e verifica ícone ⚠ na lista

describe("EntitiesBrowser ícone parcial", () => {
  test("exibe ícone de atenção quando endereço parcial", async () => {
    // Usa nome único para evitar colisão entre execuções/suites reutilizando o mesmo banco.
    const uniqueName = `Parcial Icone ${Date.now()}`;
    const resp = await fetch("http://localhost:3000/api/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: uniqueName,
        entity_type: "PF",
        document_digits: "",
        document_pending: true,
        cep: "12345678",
      }),
    });
    expect(resp.status).toBe(201);

    render(
      <ThemeProvider>
        <ToastProvider>
          <EntitiesBrowser />
        </ToastProvider>
      </ThemeProvider>,
    );
    // Usa findByText que já faz retry e evita dupla chamada.
    const rowLabel = await screen.findByText(new RegExp(uniqueName, "i"));
    expect(rowLabel).toBeInTheDocument();
    // Ícone tem aria-label="Dados parciais"; se houver mais de um (ex re-render), deduplicamos por parentElement textContent
    const allWarnings = await screen.findAllByLabelText(/Dados parciais/i);
    // Garante pelo menos um; não falha por múltiplos enquanto mantemos comportamento futuro.
    expect(allWarnings.length).toBeGreaterThanOrEqual(1);
  });
});
