import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { EntitiesBrowser } from "components/entities/list/EntitiesBrowser";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";

// Teste: cria entidade via API com endereço parcial e verifica ícone ⚠ na lista

describe("EntitiesBrowser ícone parcial", () => {
  test("exibe ícone de atenção quando endereço parcial", async () => {
    const resp = await fetch("http://localhost:3000/api/v1/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Parcial Icone",
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
      </ThemeProvider>
    );
    await waitFor(() => expect(screen.getByText(/Parcial Icone/i)).toBeInTheDocument());
    const warnings = screen.getAllByLabelText(/Dados parciais/i);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
