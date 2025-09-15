import '@testing-library/jest-dom';

// Polyfills para ambiente de testes (pg e outros pacotes podem requerer)
import { TextEncoder, TextDecoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  // eslint-disable-next-line no-new-func
  global.TextDecoder = TextDecoder;
}

// Opcional: aumentar timeout global para testes de API mais lentos
jest.setTimeout(70000);
