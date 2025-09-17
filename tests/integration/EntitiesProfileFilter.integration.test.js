import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { EntitiesBrowser } from "components/entities/list/EntitiesBrowser";

// Cria duas entidades, uma PF (Cliente) e uma PJ (Fornecedor)
async function createEntity({ name, type }) {
  const payload = {
    name,
    entity_type: type, // "PF" | "PJ"
    document_digits: "",
    document_pending: true,
  };
  const res = await fetch("http://localhost:3000/api/v1/entities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  expect(res.status).toBe(201);
  return res.json();
}

describe("EntitiesBrowser filtro de Perfil", () => {
  test("deve filtrar por Cliente (PF) e Fornecedor (PJ)", async () => {
    const namePF = `PF-${Date.now()}`;
    const namePJ = `PJ-${Date.now()}`;

    await createEntity({ name: namePF, type: "PF" });
    await createEntity({ name: namePJ, type: "PJ" });

    render(
      <ThemeProvider>
        <ToastProvider>
          <EntitiesBrowser limit={50} />
        </ToastProvider>
      </ThemeProvider>
    );

    // Aguarda ambos aparecerem inicialmente (perfil = (todos))
    const rowPF = await screen.findByText(new RegExp(namePF, "i"));
    expect(rowPF).toBeInTheDocument();
    const rowPJ = await screen.findByText(new RegExp(namePJ, "i"));
    expect(rowPJ).toBeInTheDocument();

    // Seleciona Perfil = Cliente e verifica somente PF aparecendo
    const profileSelect = screen.getByLabelText(/Perfil/i);
    fireEvent.change(profileSelect, { target: { value: "client" } });

    // Deve continuar vendo PF
    const rowPF2 = await screen.findByText(new RegExp(namePF, "i"));
    expect(rowPF2).toBeInTheDocument();
    // E o PJ deve desaparecer (aguarda atualização do fetch com debounce)
    await waitFor(() => {
      expect(screen.queryByText(new RegExp(namePJ, "i"))).toBeNull();
    });

    // Troca para Fornecedor
    fireEvent.change(profileSelect, { target: { value: "supplier" } });

    const rowPJ2 = await screen.findByText(new RegExp(namePJ, "i"));
    expect(rowPJ2).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(new RegExp(namePF, "i"))).toBeNull();
    });

    // Volta para (todos)
    fireEvent.change(profileSelect, { target: { value: "" } });
    const bothPF = await screen.findByText(new RegExp(namePF, "i"));
    const bothPJ = await screen.findByText(new RegExp(namePJ, "i"));
    expect(bothPF).toBeInTheDocument();
    expect(bothPJ).toBeInTheDocument();
  });
});
