/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'contexts/ThemeContext';
import { ToastProvider } from 'components/entities/shared/toast';
import { OrdersManager } from 'components/pedidos/orders';
import { MSG } from 'components/common/messages';

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe('Orders UI - Error listagem', () => {
  test('exibe linha de erro quando API falha', async () => {
    global.fetch = jest.fn((input) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (url?.startsWith('/api/v1/pedidos?')) {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Falha simulada' }) });
      }
      // migrations etc
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <Wrapper>
        <OrdersManager />
      </Wrapper>
    );

    // Deve exibir erro na tabela (texto retornado)
    const errorCell = await screen.findByText('Falha simulada');
    expect(errorCell).toBeInTheDocument();
    // Não deve exibir MSG.PEDIDOS_EMPTY simultaneamente
    expect(screen.queryByText(MSG.PEDIDOS_EMPTY)).toBeNull();
  });
});
