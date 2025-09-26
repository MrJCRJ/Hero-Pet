/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'contexts/ThemeContext';
import { ToastProvider } from 'components/entities/shared/toast';
import { PedidoForm } from 'components/PedidoForm';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    const u = String(url);
    if (u.startsWith('/api/v1/entities')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (u.startsWith('/api/v1/produtos')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  });
});

afterEach(() => jest.restoreAllMocks());

function Wrapper() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PedidoForm onCreated={() => {}} />
      </ToastProvider>
    </ThemeProvider>
  );
}

test('orçamento simplificado aparece apenas quando tipo COMPRA', async () => {
  render(<Wrapper />);

  // Inicialmente tipo VENDA: bloco não deve existir
  expect(screen.queryByTestId('orcamento-compra')).not.toBeInTheDocument();

  // Muda para COMPRA
  const tipoLabel = screen.getByText('Tipo');
  const selectTipo = tipoLabel.parentElement.querySelector('select');
  await userEvent.selectOptions(selectTipo, 'COMPRA');

  // Bloco presente com mensagem de vazio (sem itens com custos)
  const bloco = await screen.findByTestId('orcamento-compra');
  expect(bloco).toBeInTheDocument();
  expect(
    screen.getByText(/Nenhum item com custo para agrupar/i)
  ).toBeInTheDocument();
});
