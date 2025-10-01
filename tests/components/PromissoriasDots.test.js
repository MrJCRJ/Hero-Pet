import { render, screen, fireEvent } from '@testing-library/react';
import PromissoriasDots from 'components/orders/PromissoriasDots';
import React from 'react';

// Helper para mock de fetch sequencial
function mockFetchSequence(responses) {
  const original = global.fetch;
  const queue = [...responses];
  global.fetch = jest.fn(() => {
    const next = queue.shift();
    if (!next) return Promise.reject(new Error('No more mock responses'));
    if (next.error) {
      return Promise.resolve({ ok: false, json: async () => ({ error: next.error }) });
    }
    return Promise.resolve({ ok: true, json: async () => next.data });
  });
  return () => { global.fetch = original; };
}

describe('PromissoriasDots', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('render fallback count while vazio e depois carrega dados', async () => {
    const restore = mockFetchSequence([
      { data: [] }, // primeira fetch retorna vazio
      { data: [{ seq: 1, status: 'PENDENTE', amount: 10, due_date: '2025-10-05' }] }
    ]);

    const { rerender, findByLabelText } = render(<PromissoriasDots pedidoId={123} count={3} />);

    // fallback: deve existir aria-label com count
    expect(screen.getByLabelText(/3 parcela\(s\)/i)).toBeInTheDocument();

    // Força recarregar para segunda resposta
    await rerender(<PromissoriasDots pedidoId={123} count={3} />);
    await findByLabelText(/PENDENTE/i);

    restore();
  });

  test('mostra skeleton durante loading inicial', () => {
    // mock fetch pendente (Promise que nunca resolve no escopo do teste)
    const original = global.fetch;
    global.fetch = jest.fn(() => new Promise(() => { }));
    render(<PromissoriasDots pedidoId={99} count={2} />);
    expect(screen.getByLabelText(/Carregando parcelas/i)).toBeInTheDocument();
    global.fetch = original;
  });

  test('retry em erro inicial', async () => {
    const restore = mockFetchSequence([
      { error: 'Falha' },
      { data: [{ seq: 1, status: 'PAGO', amount: 50, paid_at: '2025-10-01' }] }
    ]);

    render(<PromissoriasDots pedidoId={55} />);
    const btn = await screen.findByRole('button', { name: /erro/i });
    fireEvent.click(btn);
    const paid = await screen.findByLabelText(/PAGO/i);
    expect(paid).toBeInTheDocument();
    restore();
  });
});
