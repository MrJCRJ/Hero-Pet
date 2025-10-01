import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsManager } from 'components/products/manager';
import { ToastProvider } from 'components/entities/shared/toast';

// Mock useProducts para controlar rows e refresh
jest.mock('components/products/hooks', () => {
  return {
    useProducts: () => ({
      rows: [
        { id: 1, nome: 'Ração Premium', categoria: 'ALIMENTO', ativo: true },
        { id: 2, nome: 'Areia Sanitária', categoria: 'HIGIENE', ativo: false },
      ],
      loading: false,
      query: { q: '', categoria: '', ativo: 'all' },
      setQ: jest.fn(),
      setCategoria: jest.fn(),
      setAtivo: jest.fn(),
      refresh: jest.fn(),
    })
  };
});

// Mock ProductRow para expor botões de inativar/reativar simples
jest.mock('components/products/ProductRow', () => ({
  __esModule: true,
  default: ({ p, onInactivate, onReactivate }) => (
    <tr>
      <td>{p.nome}</td>
      <td>
        {p.ativo ? (
          <button aria-label={`Inativar ${p.nome}`} onClick={() => onInactivate(p)}>Inativar</button>
        ) : (
          <button aria-label={`Reativar ${p.nome}`} onClick={() => onReactivate(p)}>Reativar</button>
        )}
      </td>
    </tr>
  )
}));

// Intercepta fetch
const originalFetch = global.fetch;

function mockFetchSequence(sequence) {
  let call = 0;
  global.fetch = jest.fn(async () => {
    const current = sequence[call] || sequence[sequence.length - 1];
    call++;
    if (current.ok) {
      return { ok: true, json: async () => ({}), text: async () => '' };
    }
    return { ok: false, text: async () => current.message || 'Erro' };
  });
  return () => call; // retorna função para consultar número de chamadas se quiser
}

describe('ProductsManager toggle (ConfirmDialog + toast)', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('Fecha dialog e mostra toast em sucesso de inativação', async () => {
    mockFetchSequence([{ ok: true }]);
    render(
      <ToastProvider>
        <ProductsManager />
      </ToastProvider>
    );
    const btn = screen.getByLabelText('Inativar Ração Premium');
    await userEvent.click(btn);
    // Abre ConfirmDialog => botão "Inativar"
    const confirm = await screen.findByRole('button', { name: /Inativar$/ });
    await userEvent.click(confirm);
    // Toast de sucesso
    await screen.findByText('Produto inativado');
    // Dialog deve fechar: botão não encontrado mais
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Inativar$/ })).toBeNull();
    });
  });

  test('Fecha dialog e mostra toast de erro em falha', async () => {
    mockFetchSequence([{ ok: false, message: 'Falha X' }]);
    render(
      <ToastProvider>
        <ProductsManager />
      </ToastProvider>
    );
    const btn = screen.getByLabelText('Inativar Ração Premium');
    await userEvent.click(btn);
    const confirm = await screen.findByRole('button', { name: /Inativar$/ });
    await userEvent.click(confirm);
    await screen.findByText(/Falha/);
    // Dialog fechou mesmo após erro
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Inativar$/ })).toBeNull();
    });
  });

  test('Reativação: sucesso fecha e mostra toast', async () => {
    mockFetchSequence([{ ok: true }]);
    render(
      <ToastProvider>
        <ProductsManager />
      </ToastProvider>
    );
    const btn = screen.getByLabelText('Reativar Areia Sanitária');
    await userEvent.click(btn);
    const confirm = await screen.findByRole('button', { name: /Reativar$/ });
    await userEvent.click(confirm);
    await screen.findByText('Produto reativado');
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Reativar$/ })).toBeNull();
    });
  });
});
