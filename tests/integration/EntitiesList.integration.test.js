import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntitiesPage from 'pages/entities';

/**
 * Mock simples de fetch para testar interações de filtro na página de entities.
 * Não exercita backend real (coberto pelos testes de API). Aqui validamos:
 * - Render inicial com dados
 * - Alteração de filtro status dispara nova busca
 * - Checkbox pending altera query
 */

describe('EntitiesPage - Integração UI isolada', () => {
  const originalFetch = global.fetch;
  const makeResponse = (json) => ({ ok: true, json: async () => json });
  let calls = [];

  beforeEach(() => {
    calls = [];
    global.fetch = jest.fn((url) => {
      calls.push(url.toString());
      if (url.startsWith('/api/v1/entities/summary')) {
        return Promise.resolve(makeResponse({
          total: 3,
          by_status: { pending: 1, provisional: 1, valid: 1 },
          by_pending: { true: 1, false: 2 },
        }));
      }
      if (url.startsWith('/api/v1/entities?')) {
        const u = new URL('http://test' + url.replace(/^\/api\/v1\/entities/, '/api/v1/entities'));
        const status = u.searchParams.get('status');
        const pending = u.searchParams.get('pending');
        // Gera lista conforme filtros simulados
        let base = [
          { id: 1, name: 'ALFA', entity_type: 'PF', document_digits: '52998224725', document_status: 'valid', document_pending: false, created_at: new Date().toISOString() },
          { id: 2, name: 'BETA', entity_type: 'PJ', document_digits: '', document_status: 'pending', document_pending: true, created_at: new Date().toISOString() },
          { id: 3, name: 'GAMMA', entity_type: 'PF', document_digits: '11111111111', document_status: 'provisional', document_pending: false, created_at: new Date().toISOString() },
        ];
        if (status) base = base.filter(r => r.document_status === status);
        if (pending === 'true') base = base.filter(r => r.document_pending);
        return Promise.resolve(makeResponse({ data: base, total: base.length }));
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('render inicial mostra tabela e summary', async () => {
    render(<EntitiesPage />);
    expect(await screen.findByText(/Entities/)).toBeInTheDocument();
    // Aguarda badge Total
    expect(await screen.findByText(/Total:/)).toBeInTheDocument();
    // Tabela com pelo menos um dos nomes mockados
    expect(await screen.findByText('ALFA')).toBeInTheDocument();
  });

  test('filtro status reduz resultados', async () => {
    const user = userEvent.setup();
    render(<EntitiesPage />);
    const select = await screen.findByLabelText(/Status/i);
    // garante que carregamento inicial terminou (select habilitado)
    await waitFor(() => {
      expect(screen.queryByText(/Carregando/)).toBeNull();
    });
    await user.selectOptions(select, 'valid');
    // aguarda segunda chamada contendo status=valid
    await waitFor(() => {
      expect(calls.some(u => /status=valid/.test(u))).toBe(true);
    });
    await waitFor(() => {
      // agora dataset deve conter apenas ALFA
      expect(screen.getByText('ALFA')).toBeInTheDocument();
      expect(screen.queryByText('BETA')).toBeNull();
      expect(screen.queryByText('GAMMA')).toBeNull();
    });
  });

  test('checkbox pending filtra apenas pendentes', async () => {
    const user = userEvent.setup();
    render(<EntitiesPage />);
    const checkbox = await screen.findByLabelText(/Apenas marcados como pending/i);
    await user.click(checkbox);
    await waitFor(() => {
      expect(screen.getByText('BETA')).toBeInTheDocument();
      expect(screen.queryByText('ALFA')).toBeNull();
      expect(screen.queryByText('GAMMA')).toBeNull();
    });
  });

  test('combinação de status + pending resulta possivelmente vazio', async () => {
    const user = userEvent.setup();
    render(<EntitiesPage />);
    const checkbox = await screen.findByLabelText(/Apenas marcados como pending/i);
    const select = await screen.findByLabelText(/Status/i);
    await user.click(checkbox); // agora só BETA (pending status)
    await user.selectOptions(select, 'valid'); // não existe entity pending + valid no mock
    await waitFor(() => {
      expect(screen.getByText(/Nenhum registro/)).toBeInTheDocument();
    });
  });
});
