import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageSection } from "@/components/layout/PageSection";

describe("PageSection", () => {
  it("renderiza children sem título", () => {
    render(
      <PageSection>
        <div data-testid="child">Conteúdo</div>
      </PageSection>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("Conteúdo");
  });

  it("renderiza título quando fornecido", () => {
    render(
      <PageSection title="Título da Seção">
        <div>Conteúdo</div>
      </PageSection>
    );
    expect(screen.getByRole("heading", { name: /Título da Seção/ })).toBeInTheDocument();
  });

  it("renderiza descrição quando fornecida", () => {
    render(
      <PageSection title="Título" description="Descrição da página">
        <div>Conteúdo</div>
      </PageSection>
    );
    expect(screen.getByText("Descrição da página")).toBeInTheDocument();
  });

  it("aplica aria-labelledby quando tem título", () => {
    const { container } = render(
      <PageSection title="Acessibilidade">
        <div>Conteúdo</div>
      </PageSection>
    );
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("aria-labelledby", "page-section-title");
  });
});
