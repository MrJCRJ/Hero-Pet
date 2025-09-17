/* eslint-disable camelcase */
/**
 * Migration: add numero, complemento, ativo columns to entities
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("entities", {
    numero: { type: "text" },
    complemento: { type: "text" },
    ativo: { type: "boolean", notNull: true, default: true },
  });
  pgm.addIndex("entities", ["ativo"]);
};

exports.down = (pgm) => {
  pgm.dropIndex("entities", ["ativo"]);
  pgm.dropColumns("entities", ["numero", "complemento", "ativo"]);
};
