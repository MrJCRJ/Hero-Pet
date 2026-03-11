/**
 * @jest-environment jsdom
 *
 * Testes TDD para MainNav (navegação do App Router).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MainNav } from "@/components/layout/MainNav";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: null })),
}));

const { usePathname } = require("next/navigation");

describe("MainNav", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/entities");
  });

  it("renderiza link Cliente / Fornecedor", () => {
    render(<MainNav />);
    expect(screen.getByRole("link", { name: /Cliente \/ Fornecedor/ })).toBeInTheDocument();
  });

  it("renderiza link Produtos", () => {
    render(<MainNav />);
    expect(screen.getByRole("link", { name: /Produtos/ })).toBeInTheDocument();
  });

  it("renderiza link Pedidos", () => {
    render(<MainNav />);
    expect(screen.getByRole("link", { name: /Pedidos/ })).toBeInTheDocument();
  });

  it("renderiza link Financeiro", () => {
    render(<MainNav />);
    expect(screen.getByRole("link", { name: /Financeiro/ })).toBeInTheDocument();
  });

  it("links apontam para rotas corretas", () => {
    render(<MainNav />);
    expect(screen.getByRole("link", { name: /Cliente \/ Fornecedor/ })).toHaveAttribute("href", "/entities");
    expect(screen.getByRole("link", { name: /Produtos/ })).toHaveAttribute("href", "/produtos");
    expect(screen.getByRole("link", { name: /Pedidos/ })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("link", { name: /Financeiro/ })).toHaveAttribute("href", "/financeiro");
  });

  it("não renderiza link Início", () => {
    render(<MainNav />);
    expect(screen.queryByRole("link", { name: /Início/ })).not.toBeInTheDocument();
  });

  it("tem role navigation e aria-label", () => {
    render(<MainNav />);
    const nav = screen.getByRole("navigation", { name: /Menu principal/ });
    expect(nav).toBeInTheDocument();
  });
});
