/* eslint-disable camelcase */
/**
 * Migration: add foto_url to produtos
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("produtos", {
    foto_url: { type: "text" },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("produtos", "foto_url");
};
