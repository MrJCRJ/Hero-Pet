/* eslint-disable camelcase */
/**
 * Migration: create pedido_promissorias table
 * Stores per-installment schedule for orders (pedidos), including PIX info and payment date.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("pedido_promissorias", {
    id: "id",
    pedido_id: {
      type: "integer",
      notNull: true,
      references: "pedidos",
      onDelete: "CASCADE",
    },
    seq: { type: "integer", notNull: true }, // 1..N
    due_date: { type: "date", notNull: true },
    amount: { type: "numeric(14,2)", notNull: true },
    paid_at: { type: "timestamptz" },
    pix_txid: { type: "text" },
    pix_brcode: { type: "text" }, // copia e cola (sem código de barras)
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

  pgm.addConstraint(
    "pedido_promissorias",
    "pedido_promissorias_pedido_seq_unique",
    {
      unique: ["pedido_id", "seq"],
    },
  );

  pgm.createIndex("pedido_promissorias", ["pedido_id"], {
    name: "pedido_promissorias_pedido_idx",
  });
  pgm.createIndex("pedido_promissorias", ["pedido_id", "due_date"], {
    name: "pedido_promissorias_due_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("pedido_promissorias", ["pedido_id", "due_date"], {
    ifExists: true,
    name: "pedido_promissorias_due_idx",
  });
  pgm.dropIndex("pedido_promissorias", ["pedido_id"], {
    ifExists: true,
    name: "pedido_promissorias_pedido_idx",
  });
  pgm.dropConstraint(
    "pedido_promissorias",
    "pedido_promissorias_pedido_seq_unique",
    { ifExists: true },
  );
  pgm.dropTable("pedido_promissorias", { ifExists: true });
};
