/** @jest-environment jsdom */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'contexts/ThemeContext';
import { ToastProvider } from 'components/entities/shared/toast';
import { OrdersManager } from 'components/orders';

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

describe('OrdersManager FIFO eligible -> migrate (E2E UI)', () => {
  beforeEach(() => {
    let migrated = false;
    global.fetch = jest.fn(async (url, opts) => {
      const u = String(url);
      if (u.includes('/api/v1/pedidos/legacy_count')) {
        return { ok: true, json: async () => ({ legacy_count: 0 }) };
      }
      if (u.includes('/api/v1/pedidos?')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 501,
              tipo: 'VENDA',
              partner_name: 'CLIENTE MIGRACAO',
              data_emissao: '2025-09-10',
              total_liquido: 100,
              numero_promissorias: 1,
              tem_nota_fiscal: false,
              fifo_state: migrated ? 'fifo' : 'eligible',
            },
          ],
        };
      }
      if (u.match(/\/api\/v1\/pedidos\/501$/) && opts?.method === 'PUT') {
        migrated = true;
        return { ok: true, json: async () => ({ migrated: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  test('mostra ELIGIBLE e após clique migra para FIFO (otimista)', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <OrdersManager limit={20} />
      </Wrapper>
    );

    await screen.findByText('CLIENTE MIGRACAO');
    const row = screen.getByText('CLIENTE MIGRACAO').closest('tr');
    expect(row).toBeTruthy();

    // Badge ELIGIBLE presente
    expect(within(row).getByText('ELIGIBLE')).toBeInTheDocument();

    const btn = within(row).getByRole('button', { name: /Migrar FIFO/i });
    expect(btn).toBeInTheDocument();

    await user.click(btn);

    // Otimista: badge deve virar FIFO e botão sumir
    expect(within(row).getByText('FIFO')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /Migrar FIFO/i })).toBeNull();
  });
});
