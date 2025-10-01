import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsManager } from 'components/products/manager';
import { ToastProvider } from 'components/entities/shared/toast';

// Mock useProducts para ter um produto ativo
jest.mock('components/products/hooks', () => ({
  useProducts: () => ({
    rows: [{ id: 10, nome: 'Produto X', categoria: 'TESTE', ativo: true }],
    loading: false,
    query: { q: '', categoria: '', ativo: 'all' },
    setQ: jest.fn(),
    setCategoria: jest.fn(),
    setAtivo: jest.fn(),
    refresh: jest.fn(),
  })
}));

// Mock ProductRow com botão de hard delete
jest.mock('components/products/ProductRow', () => ({
  __esModule: true,
  default: ({ p, onHardDelete }) => (
    <tr>
      <td>{p.nome}</td>
      <td>
        <button aria-label={`Hard delete ${p.nome}`} onClick={() => onHardDelete(p)}>HardDelete</button>
      </td>
    </tr>
  )
}));

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn(async (url) => {
    // Aceitar DELETE somente quando senha correta
    if (url.includes('?hard=true')) {
      if (url.includes('password=98034183')) {
        return { ok: true, text: async () => '', json: async () => ({}) };
      }
      return { ok: false, status: 400, text: async () => 'Senha inválida' };
    }
    return { ok: true, json: async () => ({}) };
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe('Hard delete produto', () => {
  test('Senha inválida gera toast de erro e mantém dialog aberto até fechar', async () => {
    render(<ToastProvider><ProductsManager /></ToastProvider>);
    await userEvent.click(screen.getByLabelText('Hard delete Produto X'));
    // Input de senha no ConfirmDialog
    const pwdInput = await screen.findByPlaceholderText('Senha');
    await userEvent.type(pwdInput, '123');
    const btn = screen.getByRole('button', { name: /Excluir/ });
    await userEvent.click(btn);
    await screen.findByText('Senha inválida');
    // Dialog ainda aberto (botão excluir presente)
    expect(screen.getByRole('button', { name: /Excluir/ })).toBeInTheDocument();
  });

  test('Senha correta executa exclusão e fecha dialog com toast sucesso', async () => {
    render(<ToastProvider><ProductsManager /></ToastProvider>);
    await userEvent.click(screen.getByLabelText('Hard delete Produto X'));
    const pwdInput = await screen.findByPlaceholderText('Senha');
    await userEvent.type(pwdInput, '98034183');
    const btn = screen.getByRole('button', { name: /Excluir/ });
    await userEvent.click(btn);
    await screen.findByText('Produto excluído definitivamente');
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Excluir/ })).toBeNull();
    });
  });
});
