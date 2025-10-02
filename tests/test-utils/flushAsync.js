import { act } from '@testing-library/react';

/**
 * flushAsync
 * Aguarda um ciclo de microtasks + próximo tick para estabilizar efeitos assíncronos
 * e setStates disparados em useEffect/fetch sem necessidade de espalhar act() nos testes.
 */
export async function flushAsync(times = 1) {
  for (let i = 0; i < times; i++) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => {
      await Promise.resolve();
    });
  }
}
