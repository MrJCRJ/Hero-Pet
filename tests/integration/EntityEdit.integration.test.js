import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from 'pages/index';

/**
 * Teste de integração simplificado para fluxo de edição:
 * - Mocka fetch inicial (lista + summary)
 * - Clica em linha para abrir edição
 * - Altera nome e submete PUT
 */

describe('Entity edit flow', () => {
  const originalFetch = global.fetch;
  let calls = [];
  const makeResponse = (json, ok = true, status = 200) => ({ ok, status, json: async () => json });

  const entity = {
    id: 10,
    name: 'ACME',
    entity_type: 'PF',
    document_digits: '52998224725',
    document_status: 'valid',
    document_pending: false,
    created_at: new Date().toISOString(),
    cep: '12345678',
    telefone: '11999999999',
    email: 'a@b.com'
  };

  beforeEach(() => {
    calls = [];
    global.fetch = jest.fn((url, opts = {}) => {
      calls.push({ url: url.toString(), opts });
      if (url.startsWith('/api/v1/entities/summary')) {
        return Promise.resolve(makeResponse({
          total: 1,
          by_status: { valid: 1 },
          by_pending: { false: 1 }
        }));
      }
      if (url.startsWith('/api/v1/entities?')) {
        return Promise.resolve(makeResponse({ data: [entity], total: 1 }));
      }
      if (url === `/api/v1/entities/${entity.id}` && opts.method === 'PUT') {
        return Promise.resolve(makeResponse({ ...entity, name: 'ACME EDIT' }));
      }
      // fallback POST (não usado aqui)
      if (url === '/api/v1/entities' && opts.method === 'POST') {
        return Promise.resolve(makeResponse(entity));
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'not found' }) });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('abre formulário em modo edição ao clicar e envia PUT', async () => {
    const user = userEvent.setup();
    render(<Home />);

    // Acessa painel admin (simulando login) -> a página atual depende de auth? Se precisar, poderíamos mockar, mas assumimos acesso direto.
    // Aguarda render da listagem
    const rowCell = await screen.findByText('ACME');
    await user.click(rowCell);

    // Título deve indicar edição
    await waitFor(() => {
      expect(screen.getByText(/Editando/)).toBeInTheDocument();
    });

    const nomeInput = screen.getByLabelText(/NOME/i);
    await user.clear(nomeInput);
    await user.type(nomeInput, 'ACME EDIT');

    const submitBtn = screen.getByRole('button', { name: /Atualizar/i });
    await user.click(submitBtn);

    await waitFor(() => {
      // Deve ter ocorrido chamada PUT
      expect(calls.some(c => c.url.endsWith(`/api/v1/entities/${entity.id}`) && c.opts.method === 'PUT')).toBe(true);
    });
  });
});
