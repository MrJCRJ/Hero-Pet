// Helpers para testar comportamento de highlight (carregamento automático via ?highlight=)
// Uso: importar em testes de integração que simulam deep-link de edição.
import { screen, waitFor } from '@testing-library/react';

/** Aguarda texto de carregamento padrão "Carregando <entidade> #ID…" */
export async function waitHighlightLoading(id, matcher = /Carregando/i) {
  await waitFor(() => {
    const el = screen.getByText((txt) => matcher.test(txt) && txt.includes(`#${id}`));
    expect(el).toBeInTheDocument();
  });
}

/** Verifica que mensagem de erro de highlight apareceu */
export async function waitHighlightError() {
  await waitFor(() => {
    const el = screen.getByText((txt) => /#?\d+/.test(txt) && /erro|falha|não/i.test(txt));
    expect(el).toBeInTheDocument();
  });
}

/** Aguarda formulário/modal abrir após highlight (passar label ou heading esperado) */
export async function waitHighlightOpened(labelText) {
  await waitFor(() => {
    expect(screen.getByText(labelText)).toBeInTheDocument();
  });
}
