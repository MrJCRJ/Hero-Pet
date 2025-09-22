/* eslint-disable camelcase */
/**
 * Migration: create pedido_itens table
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("pedido_itens", {
    id: "id",
    pedido_id: {
      type: "integer",
      notNull: true,
      references: "pedidos",
      onDelete: "CASCADE",
    },
    produto_id: {
      type: "integer",
      notNull: true,
      references: "produtos",
      onDelete: "RESTRICT",
    },
    quantidade: { type: "numeric(14,3)", notNull: true },
    preco_unitario: { type: "numeric(14,2)", notNull: true },
    desconto_unitario: { type: "numeric(14,2)" },
    total_item: { type: "numeric(14,2)", notNull: true },
  });

  pgm.createIndex("pedido_itens", ["pedido_id"], {
    name: "pedido_itens_pedido_idx",
  });
  pgm.createIndex("pedido_itens", ["produto_id"], {
    name: "pedido_itens_produto_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("pedido_itens", ["produto_id"], {
    name: "pedido_itens_produto_idx",
    ifExists: true,
  });
  pgm.dropIndex("pedido_itens", ["pedido_id"], {
    name: "pedido_itens_pedido_idx",
    ifExists: true,
  });
  pgm.dropTable("pedido_itens", { ifExists: true });
};
