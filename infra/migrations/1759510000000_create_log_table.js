/* eslint-disable camelcase */

/**
 * Migration: create log table
 * Tabela para auditoria de ações críticas (criação, exclusão, alterações sensíveis).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("log", {
    id: "id",
    user_id: { type: "integer", references: "users(id)", onDelete: "SET NULL" },
    action: { type: "varchar(50)", notNull: true },
    entity_type: { type: "varchar(50)" },
    entity_id: { type: "text" },
    details: { type: "jsonb" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.addIndex("log", ["user_id"]);
  pgm.addIndex("log", ["entity_type", "entity_id"]);
  pgm.addIndex("log", ["created_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("log");
};
