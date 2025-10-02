import { render } from '@testing-library/react';
import { flushAsync } from './flushAsync';

/**
 * renderAndFlush
 * Renderiza um componente e executa dois ciclos de flushAsync por padrão
 * cobrindo efeitos em cadeia: fetch -> setState(data) -> setLoading(false).
 * Ajuste "cycles" conforme necessário em cenários mais profundos.
 */
export async function renderAndFlush(ui, { cycles = 2, ...options } = {}) {
  const utils = render(ui, options);
  await flushAsync(cycles);
  return utils;
}

export default renderAndFlush;
