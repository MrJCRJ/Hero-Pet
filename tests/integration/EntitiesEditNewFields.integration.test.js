/**
 * Integração UI: criar entidade, editar numero/complemento/ativo e verificar tabela.
 * Usa jsdom + fetch real via servidor Next levantado no globalSetup.
 */
import React from "react";
import { render, screen, configure } from "@testing-library/react";
configure({ asyncUtilTimeout: 5000 });
import userEvent from "@testing-library/user-event";
import { EntitiesManager } from "components/entities";
import { ThemeProvider } from "contexts/ThemeContext";
import { ToastProvider } from "components/entities/shared/toast";

jest.setTimeout(40000);

describe("EntitiesManager novos campos (numero/complemento/ativo)", () => {
  test("Fluxo criar -> editar campos novos refletidos na lista", async () => {
    const user = userEvent.setup();
    // Bypass auth
    window.localStorage.setItem("adminAuthenticated", "true");
    render(
      <ThemeProvider>
        <ToastProvider>
          <EntitiesManager browserLimit={50} />
        </ToastProvider>
      </ThemeProvider>,
    );

    // Abrir formulário
    await user.click(screen.getByRole("button", { name: /adicionar/i }));

    // Preenche nome
    const nomeInput = screen.getByLabelText(/nome/i);
    await user.type(nomeInput, "Empresa X");

    // Marca documento pendente
    const pendente = screen.getByRole("checkbox", {
      name: /Documento ainda não disponível/i,
    });
    if (pendente) await user.click(pendente);

    // CEP opcional
    const cep = screen.getByLabelText(/cep/i);
    await user.type(cep, "01001000");

    const numero = screen.getByLabelText(/número/i);
    await user.type(numero, "12");
    const complemento = screen.getByLabelText(/complemento/i);
    await user.type(complemento, "FRENTE");

    // Salvar
    await user.click(screen.getByRole("button", { name: /salvar/i }));
    // Se ainda estamos no formulário (botão Cancelar presente) clicar para retornar à lista
    const cancelBtn = screen.queryByRole("button", { name: /cancelar/i });
    if (cancelBtn) await user.click(cancelBtn);
    await screen.findByText(/Entidades Cadastradas/i);
    await screen.findByText(/EMPRESA X/);
    // endereço deve estar completo (cep + numero)
    expect(screen.getAllByText(/completo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sim").length).toBeGreaterThan(0); // Ativo

    // Entra em edição clicando linha
    await user.click(screen.getByText(/EMPRESA X/));
    const numeroEdit = await screen.findByLabelText(/número/i);
    // Limpa e altera
    await user.clear(numeroEdit);
    await user.type(numeroEdit, "99B");
    const complementoEdit = screen.getByLabelText(/complemento/i);
    await user.clear(complementoEdit);
    await user.type(complementoEdit, "FUNDOS");
    // Desativa
    const ativoToggle = screen.getByRole("checkbox", { name: /ativo/i });
    await user.click(ativoToggle);

    await user.click(screen.getByRole("button", { name: /atualizar/i }));
    await screen.findByText(/Entidades Cadastradas/i);
    await screen.findByText(/EMPRESA X/);
    // endereço segue completo
    expect(screen.getAllByText(/completo/i).length).toBeGreaterThan(0);
    // Ativo agora "Não"
    expect(screen.getAllByText("Não").length).toBeGreaterThan(0);
  });
});
