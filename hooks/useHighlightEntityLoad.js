import { useCallback, useEffect, useState } from 'react';
import { MSG } from 'components/common/messages';

/**
 * Hook genérico para carregar automaticamente um recurso quando highlightId é fornecido.
 * Padrão: aceita função fetcher que recebe id e retorna JSON do recurso.
 * Retorna estados e função clear para resetar highlight.
 * Pode ser reutilizado em pedidos, entidades, produtos etc.
 *
 * @param {Object} options
 * @param {string|number|null} options.highlightId ID a carregar inicialmente (ex: obtido via query param)
 * @param {(id:string|number)=>Promise<any>} options.fetcher Função que faz fetch e retorna dados
 * @param {boolean} [options.autoLoad=true] Se true, carrega imediatamente ao montar se highlightId existir.
 */
export function useHighlightEntityLoad({ highlightId, fetcher, autoLoad = true }) {
  const [loadingHighlight, setLoadingHighlight] = useState(false);
  const [highlighted, setHighlighted] = useState(null);
  const [errorHighlight, setErrorHighlight] = useState(null);

  const load = useCallback(async (id) => {
    if (!id) return;
    setLoadingHighlight(true);
    setErrorHighlight(null);
    try {
      const data = await fetcher(id);
      setHighlighted(data || null);
    } catch (e) {
      setErrorHighlight(e.message || MSG.GENERIC_ERROR);
    } finally {
      setLoadingHighlight(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (autoLoad && highlightId != null && highlightId !== '') {
      load(highlightId);
    }
  }, [autoLoad, highlightId, load]);

  const clearHighlight = useCallback(() => {
    setHighlighted(null);
    setErrorHighlight(null);
  }, []);

  return {
    highlighted,
    loadingHighlight,
    errorHighlight,
    load,
    clearHighlight,
  };
}
