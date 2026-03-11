/* eslint-disable camelcase */

/**
 * Migration: create users table
 * Usuários para autenticação server-side com perfis (admin, operador, visualizador).
 */
exports.shorthands = undefined;

exports.up = async (pgm) => {
  pgm.createTable("users", {
    id: "id",
    nome: { type: "text", notNull: true },
    email: { type: "text", notNull: true, unique: true },
    senha_hash: { type: "text", notNull: true },
    role: {
      type: "varchar(20)",
      notNull: true,
      default: "operador",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.addConstraint("users", "users_role_check", {
    check: "role IN ('admin','operador','visualizador')",
  });

  pgm.addIndex("users", ["email"], { unique: true });
  // Usuário inicial deve ser criado via /setup na primeira inicialização.
};

exports.down = (pgm) => {
  pgm.dropTable("users");
};
