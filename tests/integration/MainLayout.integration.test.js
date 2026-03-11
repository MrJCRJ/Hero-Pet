/**
 * @jest-environment jsdom
 *
 * Testes de integração para MainLayout.
 * Com auth server-side, MainLayout só é exibido para usuários autenticados (middleware redireciona).
 * Valida exibição do shell quando há sessão.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/entities/shared/toast";
import { MainLayout } from "@/app/(main)/MainLayout";

const mockSession = {
  user: { name: "Test", email: "test@test.com" },
  expires: "2025-12-31",
};

function Wrapper({ children }) {
  return (
    <SessionProvider session={mockSession}>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

describe("MainLayout - integração", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exibe shell com conteúdo quando autenticado", async () => {
    global.fetch = jest.fn((url) => {
      if (typeof url === "string" && url.includes("/api/v1/status")) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => ({
            ok: true,
            data: { dependencies: { database: { status: "healthy" } } },
          }),
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    render(
      <Wrapper>
        <MainLayout>
          <div>Conteúdo</div>
        </MainLayout>
      </Wrapper>
    );

    const content = await screen.findByText("Conteúdo", {}, { timeout: 5000 });
    expect(content).toBeInTheDocument();
    expect(screen.getByText(/Sistema Hero-Pet/)).toBeInTheDocument();
  });
});
