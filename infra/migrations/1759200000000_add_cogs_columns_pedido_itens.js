/* eslint-disable camelcase */
/**
 * Migration: add COGS columns to pedido_itens
 * - custo_unit_venda: custo unitário aplicado ao item no momento da venda (numeric)
 * - custo_total_item: custo total = custo_unit_venda * quantidade (numeric)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("pedido_itens", {
    custo_unit_venda: { type: "numeric(14,2)" },
    custo_total_item: { type: "numeric(14,2)" },
  });
  pgm.createIndex("pedido_itens", ["pedido_id"], {
    name: "pedido_itens_cogs_pedido_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("pedido_itens", ["pedido_id"], {
    name: "pedido_itens_cogs_pedido_idx",
    ifExists: true,
  });
  pgm.dropColumn("pedido_itens", "custo_total_item", { ifExists: true });
  pgm.dropColumn("pedido_itens", "custo_unit_venda", { ifExists: true });
};
