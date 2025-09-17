import "@testing-library/jest-dom";

// Polyfills para ambiente de testes (pg e outros pacotes podem requerer)
import { TextEncoder, TextDecoder } from "util";
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  // eslint-disable-next-line no-new-func
  global.TextDecoder = TextDecoder;
}

// Opcional: aumentar timeout global para testes de API mais lentos
jest.setTimeout(70000);

// Mock matchMedia para ThemeContext (jsdom não implementa por padrão)
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => { },
    removeEventListener: () => { },
    addListener: () => { }, // suporte legacy
    removeListener: () => { },
    dispatchEvent: () => false,
  });
}

// Polyfill fetch para testes jsdom se necessário
// fetch polyfill consistente (cross-fetch)
try {
  const cf = require('cross-fetch');
  if (cf.fetch && typeof global.fetch === 'undefined') global.fetch = cf.fetch;
  if (cf.Headers && typeof global.Headers === 'undefined') global.Headers = cf.Headers;
  if (cf.Request && typeof global.Request === 'undefined') global.Request = cf.Request;
  if (cf.Response && typeof global.Response === 'undefined') global.Response = cf.Response;
} catch (_) {
  // cross-fetch indisponível; testes podem usar fetch nativo ou falhar explicitamente
}

// Garantir suporte a URLs relativas como em ambiente browser
if (typeof global.fetch === 'function') {
  const ORIGINAL_FETCH = global.fetch;
  global.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = 'http://localhost:3000' + input;
    }
    return ORIGINAL_FETCH(input, init);
  };
}
