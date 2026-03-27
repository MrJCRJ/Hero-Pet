/* Migration legacy placeholder.
 * Esta migration existe no histórico do banco (pgmigrations),
 * mas o arquivo havia sido removido em versões anteriores.
 * Mantemos no-op para preservar consistência do node-pg-migrate.
 */

exports.shorthands = undefined;

exports.up = () => {
  // no-op
};

exports.down = () => {
  // no-op
};

