/* eslint-disable camelcase */
/**
 * Migration: add frete fields to pedidos & pedido_itens
 * - Add frete_unitario (numeric) to pedido_itens (nullable)
 * - Add frete_total (numeric) to pedidos (nullable, aggregated)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("pedido_itens", {
    frete_unitario: { type: "numeric(14,2)" }, // custo de frete por unidade (opcional)
  });
  pgm.addColumn("pedidos", {
    frete_total: { type: "numeric(14,2)" }, // soma(frete_unitario * quantidade) (opcional)
  });
  pgm.createIndex("pedidos", ["frete_total"], {
    name: "pedidos_frete_total_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("pedidos", ["frete_total"], {
    name: "pedidos_frete_total_idx",
    ifExists: true,
  });
  pgm.dropColumn("pedidos", "frete_total", { ifExists: true });
  pgm.dropColumn("pedido_itens", "frete_unitario", { ifExists: true });
};
