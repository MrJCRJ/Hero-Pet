/* eslint-disable camelcase */
/**
 * Migration: add observacao column to entities
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("entities", {
    observacao: { type: "text" },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("entities", ["observacao"]);
};
