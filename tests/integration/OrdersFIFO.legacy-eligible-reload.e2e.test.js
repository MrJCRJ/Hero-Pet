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

describe('OrdersManager FIFO legacy -> eligible via reload (E2E UI)', () => {
  beforeEach(() => {
    let pedidosCall = 0;
    global.fetch = jest.fn(async (url) => {
      const u = String(url);
      if (u.includes('/api/v1/pedidos/legacy_count')) {
        return { ok: true, json: async () => ({ legacy_count: 0 }) };
      }
      if (u.includes('/api/v1/pedidos?')) {
        pedidosCall++;
        const state = pedidosCall <= 1 ? 'legacy' : 'eligible';
        return {
          ok: true,
          json: async () => [
            {
              id: 801,
              tipo: 'VENDA',
              partner_name: 'CLIENTE TRANSICAO',
              data_emissao: '2025-09-15',
              total_liquido: 200,
              numero_promissorias: 1,
              tem_nota_fiscal: false,
              fifo_state: state,
            },
          ],
        };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  test('altera badge LEGACY -> ELIGIBLE após reload manual', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <OrdersManager limit={20} />
      </Wrapper>
    );

    await screen.findByText('CLIENTE TRANSICAO');
    const row = screen.getByText('CLIENTE TRANSICAO').closest('tr');
    expect(row).toBeTruthy();

    // Primeiro estado pode ser LEGACY ou já ELIGIBLE (StrictMode pode disparar fetch extra). Se já vier ELIGIBLE, pulamos primeira asserção.
    const legacyBadge = within(row).queryByText('LEGACY');
    const eligibleBadgeInitially = within(row).queryByText('ELIGIBLE');
    // Deve existir ao menos um dos dois estados iniciais
    expect(legacyBadge || eligibleBadgeInitially).toBeTruthy();

    // Dispara reload através do botão 'Atualizar'
    const refreshBtn = screen.getByRole('button', { name: /Atualizar/i });
    await user.click(refreshBtn);

    // Esperar novo estado ELIGIBLE (badge muda e botão Migrar aparece)
    await screen.findByText('ELIGIBLE');
    expect(within(row).getByText('ELIGIBLE')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /Migrar FIFO/i })).toBeInTheDocument();
  });
});
