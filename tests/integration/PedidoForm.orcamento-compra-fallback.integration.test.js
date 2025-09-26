/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'contexts/ThemeContext';
import { ToastProvider } from 'components/entities/shared/toast';
import { PedidoForm } from 'components/PedidoForm';

// Testa fallback: quando não há custos carregados, usa (preço - desconto) como base do agrupamento.
// Cenário: dois itens de produtos distintos, apenas preco_unitario preenchido.

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/api/v1/entities')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (String(url).includes('/api/v1/produtos')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
});

afterEach(() => jest.restoreAllMocks());

function renderWithProviders(node) {
  return render(
    <ThemeProvider>
      <ToastProvider>{node}</ToastProvider>
    </ThemeProvider>
  );
}

test('fallback utiliza preco - desconto e calcula lucro líquido com comissão vendedor 3%', async () => {
  // Produto 1: qtd 10, preço 8, sem desconto -> bruto 80
  // Produto 2: qtd 5, preço 6, desconto 1 -> unit líquido 5 -> bruto 25
  // Total bruto = 105. Frete = 21.
  // Rateio frete: prod1 => (80/105)*21 = 16; prod2 => (25/105)*21 = 5 (arredondados devido a toFixed interno eventual)
  // Custo total prod1 ~ 96 => custo médio 9,60
  // Custo total prod2 ~ 30 => custo médio 6,00
  // Totais: qtd 15; total ~ 126; custo médio global 126/15 = 8,40

  const editingOrder = {
    id: 1001,
    tipo: 'COMPRA',
    partner_entity_id: 1,
    partner_name: 'Fornecedor X',
    itens: [
      { produto_id: 1, produto_nome: 'A', quantidade: 10, preco_unitario: 8, desconto_unitario: 0 },
      { produto_id: 2, produto_nome: 'B', quantidade: 5, preco_unitario: 6, desconto_unitario: 1 },
    ],
    frete_total: 21,
    status: 'novo'
  };

  renderWithProviders(<PedidoForm editingOrder={editingOrder} />);

  const bloco = await screen.findByTestId('orcamento-compra');
  expect(bloco).toBeInTheDocument();

  expect(screen.getByTestId('orc-qtd-1').textContent).toBe('10');
  expect(screen.getByTestId('orc-ct-1').textContent).toMatch(/R\$\s?96,00/);
  expect(screen.getByTestId('orc-cm-1').textContent).toMatch(/R\$\s?9,60/);

  expect(screen.getByTestId('orc-qtd-2').textContent).toBe('5');
  expect(screen.getByTestId('orc-ct-2').textContent).toMatch(/R\$\s?30,00/);
  expect(screen.getByTestId('orc-cm-2').textContent).toMatch(/R\$\s?6,00/);

  // Inserir preços de venda:
  // Produto 1: custo médio 9,60 -> pv 12 => lucro bruto = (12 - 9,60)*10 = 24,00
  // Comissão: 12 * 10 * 0.03 = 3,60 => lucro líquido = 20,40
  // Produto 2: custo médio 6,00 -> pv 11 => lucro bruto = (11 - 6,00)*5 = 25,00
  // Comissão: 11 * 5 * 0.03 = 1,65 => lucro líquido = 23,35
  // Lucro total = 43,75
  const user = userEvent.setup();
  const pv1 = screen.getByTestId('orc-pv-1');
  const pv2 = screen.getByTestId('orc-pv-2');
  await user.clear(pv1); await user.type(pv1, '12');
  await user.clear(pv2); await user.type(pv2, '11');

  expect(screen.getByTestId('orc-lucro-1').textContent).toMatch(/R\$\s?20,40/);
  expect(screen.getByTestId('orc-lucro-2').textContent).toMatch(/R\$\s?23,35/);
  expect(screen.getByTestId('orc-total-lucro').textContent).toMatch(/R\$\s?43,75/);
});
