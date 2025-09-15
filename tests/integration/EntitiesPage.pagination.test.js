import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EntitiesPage from "pages/entities";

/**
 * Testa a paginação incremental (Carregar mais).
 * Simula backend respondendo em páginas de 20 itens até total 45.
 */

describe("EntitiesPage - Paginação", () => {
  const originalFetch = global.fetch;
  const makeResponse = (json) => ({ ok: true, json: async () => json });
  let calls = [];

  beforeEach(() => {
    calls = [];
    global.fetch = jest.fn((url) => {
      calls.push(url.toString());
      if (url.startsWith("/api/v1/entities/summary")) {
        return Promise.resolve(
          makeResponse({
            total: 45,
            by_status: { valid: 15, provisional: 15, pending: 15 },
            by_pending: { true: 15, false: 30 },
          }),
        );
      }
      if (url.startsWith("/api/v1/entities?")) {
        const u = new URL(
          "http://test" +
            url.replace(/^\/api\/v1\/entities/, "/api/v1/entities"),
        );
        const limit = Number(u.searchParams.get("limit")) || 20;
        const offset = Number(u.searchParams.get("offset")) || 0;
        const pageData = [];
        const end = Math.min(offset + limit, 45);
        for (let i = offset; i < end; i++) {
          pageData.push({
            id: i + 1,
            name: "ITEM" + (i + 1),
            entity_type: i % 2 === 0 ? "PF" : "PJ",
            document_digits: "52998224725",
            document_status:
              i % 3 === 0 ? "valid" : i % 3 === 1 ? "pending" : "provisional",
            document_pending: i % 3 === 1,
            created_at: new Date().toISOString(),
          });
        }
        return Promise.resolve(makeResponse({ data: pageData, total: 45 }));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("carrega primeira página e depois mais páginas até fim", async () => {
    const user = userEvent.setup();
    render(<EntitiesPage />);
    // primeira página
    await waitFor(() => {
      expect(screen.getByText("ITEM1")).toBeInTheDocument();
    });
    // Deve mostrar botão Carregar mais (20 < 45)
    expect(
      screen.getByRole("button", { name: /Carregar mais/i }),
    ).toBeInTheDocument();

    // Carrega segunda página
    await user.click(screen.getByRole("button", { name: /Carregar mais/i }));
    await waitFor(() => {
      expect(screen.getByText("ITEM25")).toBeInTheDocument(); // page2 includes items 21-40, ensure one in that range appears after load more
    });

    // Carrega terceira (final) página (restante 5)
    await user.click(screen.getByRole("button", { name: /Carregar mais/i }));
    await waitFor(() => {
      expect(screen.getByText("ITEM45")).toBeInTheDocument();
    });

    // Agora não deve mais existir botão carregar mais
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Carregar mais/i }),
      ).toBeNull();
      expect(screen.getByText(/Fim dos resultados/)).toBeInTheDocument();
    });
  });
});
