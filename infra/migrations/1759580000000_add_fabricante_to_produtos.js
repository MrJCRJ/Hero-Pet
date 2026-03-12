/* eslint-disable camelcase */
/**
 * Migration: add fabricante to produtos
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("produtos", {
    fabricante: { type: "text" },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("produtos", "fabricante");
};
