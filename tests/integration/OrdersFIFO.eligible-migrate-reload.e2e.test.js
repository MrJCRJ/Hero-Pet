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

describe('OrdersManager eligible -> migrate -> reload confirma FIFO persistido', () => {
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
              id: 910,
              tipo: 'VENDA',
              partner_name: 'CLIENTE RELOAD',
              data_emissao: '2025-09-20',
              total_liquido: 123,
              numero_promissorias: 1,
              tem_nota_fiscal: false,
              fifo_state: migrated ? 'fifo' : 'eligible',
            },
          ],
        };
      }
      if (u.match(/\/api\/v1\/pedidos\/910$/) && opts?.method === 'PUT') {
        migrated = true;
        return { ok: true, json: async () => ({ migrated: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  test('migra e após reload badge permanece FIFO sem botão', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <OrdersManager limit={20} />
      </Wrapper>
    );

    await screen.findByText('CLIENTE RELOAD');
    const row = screen.getByText('CLIENTE RELOAD').closest('tr');
    expect(row).toBeTruthy();
    expect(within(row).getByText('ELIGIBLE')).toBeInTheDocument();
    const btn = within(row).getByRole('button', { name: /Migrar FIFO/i });
    await user.click(btn);

    // Otimista vira FIFO
    expect(within(row).getByText('FIFO')).toBeInTheDocument();

    // Clicar botão "Atualizar" para forçar nova chamada da lista
    const refreshBtn = screen.getByRole('button', { name: /Atualizar/i });
    await user.click(refreshBtn);

    // Após reload deve continuar FIFO (vindo já do backend) e sem botão Migração
    await screen.findByText('CLIENTE RELOAD');
    const row2 = screen.getByText('CLIENTE RELOAD').closest('tr');
    expect(within(row2).getByText('FIFO')).toBeInTheDocument();
    expect(within(row2).queryByRole('button', { name: /Migrar FIFO/i })).toBeNull();
  });
});
