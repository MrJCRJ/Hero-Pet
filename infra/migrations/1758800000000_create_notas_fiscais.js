/* eslint-disable camelcase */
/**
 * No-op: NF não é persistida. Mantemos o arquivo para compatibilidade com a ordem de migrações,
 * mas não criamos nenhuma tabela/sequence.
 */

exports.shorthands = undefined;

exports.up = () => {
  // intentionally left blank
};

exports.down = () => {
  // intentionally left blank
};
