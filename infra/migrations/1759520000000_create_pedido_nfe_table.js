/* eslint-disable camelcase */
/**
 * Migration: create pedido_nfe table for NF-e integration
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("pedido_nfe", {
    id: "id",
    pedido_id: {
      type: "integer",
      notNull: true,
      references: "pedidos(id)",
      onDelete: "CASCADE",
      unique: true,
    },
    chave_acesso: { type: "varchar(44)" },
    protocolo: { type: "varchar(20)" },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "pendente",
    },
    xml_url: { type: "text" },
    danfe_url: { type: "text" },
    erro: { type: "text" },
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
  pgm.addConstraint("pedido_nfe", "pedido_nfe_status_check", {
    check: "status IN ('pendente','autorizada','rejeitada','cancelada','erro')",
  });
  pgm.addIndex("pedido_nfe", ["pedido_id"]);
  pgm.addIndex("pedido_nfe", ["chave_acesso"]);
};

exports.down = (pgm) => {
  pgm.dropTable("pedido_nfe");
};
