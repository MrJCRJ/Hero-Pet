import React from 'react';
import { render } from '@testing-library/react';
import ActivePointPanel from '../../components/orders/charts/ActivePointPanel';

const basePoint = { label: '2025-01', value: 1000 };
const prevPoint = { label: '2024-12', value: 800 };

describe('ActivePointPanel snapshots', () => {
  it('render completo', () => {
    const { container } = render(
      <ActivePointPanel
        point={basePoint}
        prevPoint={prevPoint}
        momPct={25}
        acumuladaPct={50}
        rows={[{ label: 'Vendas', value: 1000, type: 'money' }]}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('sem acumulado', () => {
    const { container } = render(
      <ActivePointPanel
        point={basePoint}
        prevPoint={prevPoint}
        momPct={25}
        acumuladaPct={50}
        showAcumulado={false}
        rows={[{ label: 'Vendas', value: 1000, type: 'money' }]}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('sem prev', () => {
    const { container } = render(
      <ActivePointPanel
        point={basePoint}
        prevPoint={null}
        momPct={25}
        acumuladaPct={50}
        showPrev={false}
        rows={[{ label: 'Vendas', value: 1000, type: 'money' }]}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('sem mom', () => {
    const { container } = render(
      <ActivePointPanel
        point={basePoint}
        prevPoint={prevPoint}
        momPct={null}
        acumuladaPct={50}
        rows={[{ label: 'Vendas', value: 1000, type: 'money' }]}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
