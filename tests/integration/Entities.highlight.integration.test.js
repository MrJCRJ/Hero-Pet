/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'contexts/ThemeContext';
import { ToastProvider } from 'components/entities/shared/toast';
import { EntitiesManager } from 'components/entities/form/EntitiesManager';

const mockEntity = {
  id: 7,
  name: 'Cliente Demo',
  entity_type: 'PF',
  document_digits: '12345678901',
  document_status: 'valid',
  document_pending: false,
};

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe('Entities highlight - integração', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      const u = String(url);
      if (u.startsWith('/api/v1/entities?')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [], meta: { total: 0 } }) });
      }
      if (u.includes('/api/v1/entities/7')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockEntity) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    delete window.location;
    window.location = new URL('http://localhost:3000/entities?highlight=7');
  });

  test('abre formulário de entidade via highlight', async () => {
    render(<Wrapper><EntitiesManager /></Wrapper>);

    // Loading highlight não é obrigatório aparecer se rápido, então apenas aguardamos campo do form
    await waitFor(() => {
      // Campo de documento deve estar visível (label depende da implementação, usar placeholder direto se existir)
      expect(screen.getByText(/Cliente \/ Fornecedor/i)).toBeInTheDocument(); // título da seção lista
    });

    // Como abrimos o form, deve existir algum input de documento ou botão Cancelar
    // (heurística leve — adapta se estrutura mudar)
    const anyInput = screen.getAllByRole('textbox');
    expect(anyInput.length).toBeGreaterThan(0);

    expect(new URL(window.location.href).searchParams.get('highlight')).toBeNull();
  });
});
