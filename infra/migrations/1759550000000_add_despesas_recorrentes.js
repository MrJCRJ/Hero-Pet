/* eslint-disable camelcase */
/**
 * Migration: despesas recorrentes
 * Campos para modelo de recorrência e link com lançamentos gerados.
 */
exports.shorthands = undefined;

exports.up = async (pgm) => {
  await pgm.db.query(`
    ALTER TABLE despesas
    ADD COLUMN IF NOT EXISTS recorrente boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS recorrencia_frequencia varchar(20),
    ADD COLUMN IF NOT EXISTS recorrencia_dia integer,
    ADD COLUMN IF NOT EXISTS recorrencia_mes integer,
    ADD COLUMN IF NOT EXISTS despesa_modelo_id integer REFERENCES despesas(id) ON DELETE SET NULL
  `);
  await pgm.db.query(`
    CREATE INDEX IF NOT EXISTS despesas_despesa_modelo_id_idx ON despesas(despesa_modelo_id)
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query("DROP INDEX IF EXISTS despesas_despesa_modelo_id_idx");
  await pgm.db.query(`
    ALTER TABLE despesas
    DROP COLUMN IF EXISTS recorrente,
    DROP COLUMN IF EXISTS recorrencia_frequencia,
    DROP COLUMN IF EXISTS recorrencia_dia,
    DROP COLUMN IF EXISTS recorrencia_mes,
    DROP COLUMN IF EXISTS despesa_modelo_id
  `);
};
