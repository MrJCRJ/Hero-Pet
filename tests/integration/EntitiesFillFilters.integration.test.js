import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";
import { EntitiesBrowser } from "components/entities/list/EntitiesBrowser";

const API = "http://localhost:3000/api/v1/entities";

async function create(entity) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entity),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`POST ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

describe("EntitiesBrowser filtros Endereço/Contato (UI)", () => {
  test("Endereço: completo/parcial/vazio", async () => {
    const ts = Date.now();
    const addrFixtures = [
      { name: `ADDR_EMPTY_${ts}`, data: {} },
      { name: `ADDR_FULL_${ts}`, data: { cep: "12345678", numero: "10" } },
      { name: `ADDR_CEP_ONLY_${ts}`, data: { cep: "12345678" } },
    ];
    for (const f of addrFixtures) {
      await create({ name: f.name, entity_type: "PF", document_digits: "", ...f.data });
    }

    render(
      <ThemeProvider>
        <ToastProvider>
          <EntitiesBrowser limit={100} />
        </ToastProvider>
      </ThemeProvider>
    );

    for (const f of addrFixtures) {
      expect(await screen.findByText(new RegExp(f.name, "i"))).toBeInTheDocument();
    }

    const addressSelect = screen.getByLabelText(/Endere[çc]o/i);

    fireEvent.change(addressSelect, { target: { value: "completo" } });
    await waitFor(() => {
      expect(screen.getByText(new RegExp(`ADDR_FULL_${ts}`, "i"))).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`ADDR_CEP_ONLY_${ts}`, "i"))).toBeNull();
      expect(screen.queryByText(new RegExp(`ADDR_EMPTY_${ts}`, "i"))).toBeNull();
    });

    fireEvent.change(addressSelect, { target: { value: "parcial" } });
    await waitFor(() => {
      expect(screen.getByText(new RegExp(`ADDR_CEP_ONLY_${ts}`, "i"))).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`ADDR_FULL_${ts}`, "i"))).toBeNull();
      expect(screen.queryByText(new RegExp(`ADDR_EMPTY_${ts}`, "i"))).toBeNull();
    });

    fireEvent.change(addressSelect, { target: { value: "vazio" } });
    await waitFor(() => {
      expect(screen.getByText(new RegExp(`ADDR_EMPTY_${ts}`, "i"))).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`ADDR_CEP_ONLY_${ts}`, "i"))).toBeNull();
      expect(screen.queryByText(new RegExp(`ADDR_FULL_${ts}`, "i"))).toBeNull();
    });
  });

  test("Contato: completo/parcial/vazio", async () => {
    const ts = Date.now();
    const contactFixtures = [
      { name: `CONTACT_EMPTY_${ts}`, data: {} },
      { name: `CONTACT_FULL_${ts}`, data: { telefone: "11987654321", email: "ok@example.com" } },
      { name: `CONTACT_TEL_VALID_ONLY_${ts}`, data: { telefone: "11987654321" } },
      { name: `CONTACT_EMAIL_ONLY_${ts}`, data: { email: "a@b.com" } },
      { name: `CONTACT_TEL_INVALID_ONLY_${ts}`, data: { telefone: "119999" } },
    ];
    for (const f of contactFixtures) {
      await create({ name: f.name, entity_type: "PF", document_digits: "", ...f.data });
    }

    render(
      <ThemeProvider>
        <ToastProvider>
          <EntitiesBrowser limit={100} />
        </ToastProvider>
      </ThemeProvider>
    );

    for (const f of contactFixtures) {
      expect(await screen.findByText(new RegExp(f.name, "i"))).toBeInTheDocument();
    }

    const contactSelect = screen.getByLabelText(/Contato/i);

    // completo: deve exibir apenas CONTACT_FULL
    fireEvent.change(contactSelect, { target: { value: "completo" } });
    await waitFor(() => {
      expect(screen.getByText(new RegExp(`CONTACT_FULL_${ts}`, "i"))).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`CONTACT_TEL_VALID_ONLY_${ts}`, "i"))).toBeNull();
      expect(screen.queryByText(new RegExp(`CONTACT_EMAIL_ONLY_${ts}`, "i"))).toBeNull();
      expect(screen.queryByText(new RegExp(`CONTACT_TEL_INVALID_ONLY_${ts}`, "i"))).toBeNull();
      expect(screen.queryByText(new RegExp(`CONTACT_EMPTY_${ts}`, "i"))).toBeNull();
    });

    // parcial: deve exibir TEL_VALID_ONLY, EMAIL_ONLY e TEL_INVALID_ONLY
    fireEvent.change(contactSelect, { target: { value: "parcial" } });
    await waitFor(() => {
      expect(screen.getByText(new RegExp(`CONTACT_TEL_VALID_ONLY_${ts}`, "i"))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`CONTACT_EMAIL_ONLY_${ts}`, "i"))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`CONTACT_TEL_INVALID_ONLY_${ts}`, "i"))).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`CONTACT_FULL_${ts}`, "i"))).toBeNull();
      expect(screen.queryByText(new RegExp(`CONTACT_EMPTY_${ts}`, "i"))).toBeNull();
    });

    // vazio: deve exibir apenas CONTACT_EMPTY
    fireEvent.change(contactSelect, { target: { value: "vazio" } });
    await waitFor(() => {
      expect(screen.getByText(new RegExp(`CONTACT_EMPTY_${ts}`, "i"))).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`CONTACT_TEL_VALID_ONLY_${ts}`, "i"))).toBeNull();
      expect(screen.queryByText(new RegExp(`CONTACT_EMAIL_ONLY_${ts}`, "i"))).toBeNull();
      expect(screen.queryByText(new RegExp(`CONTACT_TEL_INVALID_ONLY_${ts}`, "i"))).toBeNull();
      expect(screen.queryByText(new RegExp(`CONTACT_FULL_${ts}`, "i"))).toBeNull();
    });
  });
});
