/* eslint-disable camelcase */
/**
 * Migration: drop PIX fields from pedido_promissorias
 * Removes pix_txid and pix_brcode columns as the PIX generation feature was deprecated.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Use IF EXISTS to be defensive in case environments already differ
  pgm.dropColumns("pedido_promissorias", ["pix_txid", "pix_brcode"], {
    ifExists: true,
  });
};

exports.down = (pgm) => {
  // Re-create columns without data, nullable
  pgm.addColumn("pedido_promissorias", {
    pix_txid: { type: "text" },
    pix_brcode: { type: "text" },
  });
};
