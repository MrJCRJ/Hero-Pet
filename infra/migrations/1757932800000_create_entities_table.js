/* eslint-disable camelcase */

/**
 * Migration: create entities table
 * Campos principais para persistir estado de documento e filtros operacionais.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("entities", {
    id: "id",
    name: { type: "text", notNull: true },
    entity_type: { type: "varchar(2)", notNull: true }, // PF | PJ
    document_digits: { type: "varchar(14)", notNull: true, default: "" },
    document_status: { type: "varchar(20)", notNull: true, default: "pending" }, // pending | provisional | valid
    document_pending: { type: "boolean", notNull: true, default: false },
    cep: { type: "text" },
    telefone: { type: "text" },
    email: { type: "text" },
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

  pgm.addConstraint("entities", "entities_entity_type_check", {
    check: "entity_type IN ('PF','PJ')",
  });

  pgm.addIndex("entities", ["document_status"]);
  pgm.addIndex("entities", ["document_pending"]);
  pgm.addIndex("entities", ["entity_type"]);
  pgm.addIndex("entities", ["created_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("entities");
};
