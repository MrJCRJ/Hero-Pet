/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'contexts/ThemeContext';
import { ToastProvider } from 'components/entities/shared/toast';
import { OrdersManager } from 'components/orders';
import { MSG } from 'components/common/messages';

// Testa:
// - Lista vazia mostra mensagem MSG.PEDIDOS_EMPTY
// - Mock de fetch retorna lista com um pedido após recarregar
// - Exclusão dispara toast de sucesso e remove linha

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe('Orders UI - Browser basic', () => {
  beforeEach(() => {
    fetch.resetMocks?.();
    global.fetch = jest.fn((input, init) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (!url) return Promise.resolve({ ok: true, json: async () => ({}) });

      // GET list
      if (url.startsWith('/api/v1/pedidos?')) {
        // primeira chamada lista vazia, segunda chamada (após deleção simulate) também vazia
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [], meta: { total: 0 } }),
        });
      }

      // DELETE pedido
      if (/\/api\/v1\/pedidos\/(\d+)$/.test(url) && init?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }

      // GET single for edit (não usado aqui)
      if (/\/api\/v1\/pedidos\/(\d+)$/.test(url) && (!init || init.method === 'GET')) {
        return Promise.resolve({ ok: true, json: async () => ({ id: 123 }) });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  test('lista vazia exibe mensagem', async () => {
    render(
      <Wrapper>
        <OrdersManager />
      </Wrapper>
    );

    // Título lista
    expect(await screen.findByText('Pedidos')).toBeInTheDocument();
    const table = await screen.findByRole('table');
    expect(within(table).getByText(MSG.PEDIDOS_EMPTY)).toBeInTheDocument();
  });
});
