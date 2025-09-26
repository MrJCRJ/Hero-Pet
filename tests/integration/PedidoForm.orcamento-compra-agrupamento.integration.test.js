/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'contexts/ThemeContext';
import { ToastProvider } from 'components/entities/shared/toast';
import { PedidoForm } from 'components/PedidoForm';

// Estratégia: em vez de simular digitação (inputs de edição foram removidos), 
// passamos uma ordem em edição (editingOrder) já com itens possuindo custos.
// Isso permite validar a agregação + rateio de frete de forma determinística.

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

test('agrupa itens, permite preço de venda e calcula lucro líquido descontando comissão vendedor (3%)', async () => {
  // Cenário: 3 itens, dois do produto 10 e um do produto 20
  // Produto 10: item A -> qtd 10 custo 5 => 50; item B -> qtd 20 custo 7 => 140; bruto total produto 10 = 190
  // Produto 20: qtd 5 custo 4 => 20
  // Total bruto geral = 210. Frete = 42.
  // Rateio frete: produto 10 => (190/210)*42 = 38
  //               produto 20 => (20/210)*42 = 4
  // Custo total produto 10 = 190 + 38 = 228; custo médio = 228 / 30 = 7.60
  // Custo total produto 20 = 20 + 4 = 24; custo médio = 24 / 5 = 4.80
  // Totais: qtd = 35; total com frete = 252; custo médio ponderado global = 252/35 = 7.2

  const editingOrder = {
    id: 999,
    tipo: 'COMPRA',
    partner_entity_id: 1,
    partner_name: 'Fornecedor Teste',
    itens: [
      { produto_id: 10, produto_nome: 'Produto X', quantidade: 10, preco_unitario: 5, desconto_unitario: 0, custo_base_unitario: 5 },
      { produto_id: 10, produto_nome: 'Produto X', quantidade: 20, preco_unitario: 7, desconto_unitario: 0, custo_base_unitario: 7 },
      { produto_id: 20, produto_nome: 'Produto Y', quantidade: 5, preco_unitario: 4, desconto_unitario: 0, custo_base_unitario: 4 },
    ],
    frete_total: 42,
    status: 'novo'
  };

  renderWithProviders(<PedidoForm editingOrder={editingOrder} />);

  const bloco = await screen.findByTestId('orcamento-compra');
  expect(bloco).toBeInTheDocument();

  // Produto 10
  expect(screen.getByTestId('orc-qtd-10').textContent).toBe('30');
  expect(screen.getByTestId('orc-cm-10').textContent).toMatch(/R\$\s?7,60/);
  expect(screen.getByTestId('orc-ct-10').textContent).toMatch(/R\$\s?228,00/);

  // Produto 20
  expect(screen.getByTestId('orc-qtd-20').textContent).toBe('5');
  expect(screen.getByTestId('orc-cm-20').textContent).toMatch(/R\$\s?4,80/);
  expect(screen.getByTestId('orc-ct-20').textContent).toMatch(/R\$\s?24,00/);

  // Inserir preços de venda (unitários) para calcular lucro:
  // Produto 10: custo médio 7.60 -> pv 10 => lucro bruto = (10 - 7.60)*30 = 72.00
  // Comissão (3% sobre preço de venda total): 10 * 30 * 0.03 = 9.00 => lucro líquido = 63.00
  // Produto 20: custo médio 4.80 -> pv 9 => lucro bruto = (9 - 4.80)*5 = 21.00
  // Comissão: 9 * 5 * 0.03 = 1.35 => lucro líquido = 19.65
  // Lucro total = 82.65
  const user = userEvent.setup();
  const pv10 = screen.getByTestId('orc-pv-10');
  const pv20 = screen.getByTestId('orc-pv-20');
  await user.clear(pv10);
  await user.type(pv10, '10');
  await user.clear(pv20);
  await user.type(pv20, '9');

  expect(screen.getByTestId('orc-lucro-10').textContent).toMatch(/R\$\s?63,00/);
  expect(screen.getByTestId('orc-lucro-20').textContent).toMatch(/R\$\s?19,65/);
  expect(screen.getByTestId('orc-total-lucro').textContent).toMatch(/R\$\s?82,65/);
});
