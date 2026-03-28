/* eslint-disable camelcase */

/**
 * Migration: create bot_address_log table
 * Registra cada tentativa de cadastro de endereco via bot para auditoria e depuracao.
 * Politica de retencao sugerida: 90 dias (implementar via job futuro).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("bot_address_log", {
    id: "id",
    cliente_id: {
      type: "integer",
      references: "entities(id)",
      onDelete: "SET NULL",
    },
    request_payload: { type: "jsonb", notNull: true },
    response_payload: { type: "jsonb" },
    viacep_response: { type: "jsonb" },
    warning_code: { type: "varchar(50)" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.addIndex("bot_address_log", ["cliente_id"]);
  pgm.addIndex("bot_address_log", ["created_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("bot_address_log");
};
