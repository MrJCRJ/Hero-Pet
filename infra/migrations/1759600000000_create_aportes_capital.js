/* eslint-disable camelcase */
/**
 * Migration: create aportes_capital table
 * Tabela para registrar aportes de capital / investimento dos sócios
 * Usado no Fluxo de Caixa como entrada.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("aportes_capital", {
    id: "id",
    data: { type: "date", notNull: true },
    valor: { type: "numeric(14,2)", notNull: true },
    descricao: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.createIndex("aportes_capital", ["data"], {
    name: "aportes_capital_data_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("aportes_capital", ["data"], {
    name: "aportes_capital_data_idx",
    ifExists: true,
  });
  pgm.dropTable("aportes_capital", { ifExists: true });
};
