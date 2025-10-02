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
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {}, // suporte legacy
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// Polyfill fetch para testes jsdom se necessário
// fetch polyfill consistente (cross-fetch)
try {
  const cf = require("cross-fetch");
  if (cf.fetch && typeof global.fetch === "undefined") global.fetch = cf.fetch;
  if (cf.Headers && typeof global.Headers === "undefined")
    global.Headers = cf.Headers;
  if (cf.Request && typeof global.Request === "undefined")
    global.Request = cf.Request;
  if (cf.Response && typeof global.Response === "undefined")
    global.Response = cf.Response;
} catch (_) {
  // cross-fetch indisponível; testes podem usar fetch nativo ou falhar explicitamente
}

// Garantir suporte a URLs relativas como em ambiente browser
if (typeof global.fetch === "function") {
  const ORIGINAL_FETCH = global.fetch;
  global.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/")) {
      input = "http://localhost:3000" + input;
    }
    return ORIGINAL_FETCH(input, init);
  };
}

// --- Captura e inspeção de warnings de act() ---
const ACT_WARNING_SIGNATURE = "not wrapped in act";
let __capturedActWarnings = [];

const originalConsoleError = console.error;
console.error = function patchedConsoleError(...args) {
  if (
    args.some((a) => typeof a === "string" && a.includes(ACT_WARNING_SIGNATURE))
  ) {
    __capturedActWarnings.push(args.join(" "));
    // Silenciar output a menos que DEBUG_ACT_WARNINGS ativo
    if (!process.env.DEBUG_ACT_WARNINGS) return;
  }
  return originalConsoleError.apply(this, args);
};

expect.extend({
  toHaveNoActWarnings() {
    const pass = __capturedActWarnings.length === 0;
    return {
      pass,
      message: () =>
        pass
          ? "Esperava encontrar warnings de act(), mas nenhum foi capturado."
          : `Foram capturados warnings de act():\n${__capturedActWarnings.join("\n---\n")}`,
    };
  },
});

// Helper global opcional
global.expectNoActWarnings = function expectNoActWarnings() {
  if (__capturedActWarnings.length) {
    throw new Error(
      `Warnings de act() detectados:\n${__capturedActWarnings.join("\n---\n")}`,
    );
  }
};

// Limpa warnings entre testes para granularidade
beforeEach(() => {
  __capturedActWarnings = [];
});

afterEach(() => {
  if (process.env.ACT_STRICT && __capturedActWarnings.length) {
    throw new Error(
      `ACT_STRICT: warnings de act() detectados:\n${__capturedActWarnings.join("\n---\n")}`,
    );
  }
});
