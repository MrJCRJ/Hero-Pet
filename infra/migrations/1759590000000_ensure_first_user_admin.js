/* eslint-disable camelcase */
/**
 * Migration: Garante que o primeiro usuário do sistema tenha role admin.
 * Útil para recuperação quando a conta foi criada sem role ou com role incorreto.
 * Só altera se houver exatamente 1 usuário e ele não for admin.
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  const r = await pgm.db.query(`
    SELECT id, role FROM users ORDER BY id ASC LIMIT 2
  `);
  if (r.rows.length === 1 && (r.rows[0].role !== "admin" || !r.rows[0].role)) {
    await pgm.db.query(
      `UPDATE users SET role = 'admin' WHERE id = $1`,
      [r.rows[0].id]
    );
  }
};

exports.down = () => {};
