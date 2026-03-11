/* eslint-disable camelcase */

/**
 * Migration: normaliza role em users
 * - Usuários com role NULL ou inválida (ex.: 'admim', 'operator') recebem role = 'operador'
 * - Evita bloqueio de acesso para usuários antigos ou com dados inconsistentes
 */
exports.shorthands = undefined;

const VALID_ROLES = ["admin", "operador", "visualizador"];

exports.up = async (pgm) => {
  await pgm.db.query(`
    UPDATE users
    SET role = 'operador'
    WHERE role IS NULL
       OR TRIM(LOWER(role)) NOT IN (${VALID_ROLES.map((r) => `'${r}'`).join(",")})
  `);
};

exports.down = async () => {
  // Irreversível: não é possível restaurar roles inválidas
};
