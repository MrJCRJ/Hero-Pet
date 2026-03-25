/* eslint-disable camelcase */
/**
 * Migration: create metas_mensais table
 * Metas mensais da empresa para relatórios (receita/lucro/margem).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("metas_mensais", {
    id: "id",
    ano: { type: "int", notNull: true },
    mes: { type: "int", notNull: true },
    meta_receita: { type: "numeric(14,2)", notNull: true, default: 0 },
    meta_lucro_operacional: { type: "numeric(14,2)", notNull: true, default: 0 },
    // percentual (ex.: 10.5 = 10,5%)
    meta_margem_operacional: { type: "numeric(7,2)" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("NOW()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("NOW()") },
  });

  pgm.createConstraint("metas_mensais", "metas_mensais_ano_mes_unique", {
    unique: ["ano", "mes"],
  });

  pgm.createIndex("metas_mensais", ["ano", "mes"], {
    name: "metas_mensais_ano_mes_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("metas_mensais", ["ano", "mes"], {
    name: "metas_mensais_ano_mes_idx",
    ifExists: true,
  });
  pgm.dropConstraint("metas_mensais", "metas_mensais_ano_mes_unique", { ifExists: true });
  pgm.dropTable("metas_mensais", { ifExists: true });
};

