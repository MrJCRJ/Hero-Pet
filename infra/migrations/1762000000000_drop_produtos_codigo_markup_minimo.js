/* eslint-disable camelcase */
/**
 * Remove codigo_barras, markup_percent_default e estoque_minimo de produtos
 * (mínimo passa a ser só o consumo sugerido 30d via API de estoque).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropIndex("produtos", "codigo_barras", {
    name: "produtos_codigo_barras_uniq_not_null",
    ifExists: true,
  });
  pgm.dropColumn("produtos", "codigo_barras", { ifExists: true });
  pgm.dropColumn("produtos", "markup_percent_default", { ifExists: true });
  pgm.dropColumn("produtos", "estoque_minimo", { ifExists: true });
};

exports.down = (pgm) => {
  pgm.addColumn("produtos", {
    codigo_barras: { type: "text" },
    markup_percent_default: { type: "numeric(5,2)" },
    estoque_minimo: { type: "numeric(12,3)" },
  });
  pgm.createIndex("produtos", "codigo_barras", {
    name: "produtos_codigo_barras_uniq_not_null",
    unique: true,
    where: "codigo_barras IS NOT NULL",
  });
};
