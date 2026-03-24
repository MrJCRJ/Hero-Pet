/* eslint-disable camelcase */
/**
 * Migration: adiciona categoria devolucao_capital ao enum despesa_categoria.
 * Usada para marcar pagamentos que reduzem o capital investido pelos sócios.
 */
exports.shorthands = undefined;

exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TYPE despesa_categoria ADD VALUE IF NOT EXISTS 'devolucao_capital'
  `);
};

exports.down = async () => {
  // PostgreSQL não permite remover valores de enum facilmente.
  // A reversão exigiria recriar o tipo e a coluna. Deixar vazio por segurança.
};
