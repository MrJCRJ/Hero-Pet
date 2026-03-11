/* eslint-disable camelcase */

/**
 * Migration: add must_change_password + seed condicional
 * - Adiciona coluna must_change_password para forçar troca de senha
 * - Usuários existentes recebem must_change_password = true
 * - Se não houver usuários: insere admin padrão (admin@hero-pet.local / admin123) com must_change_password = true
 */
const bcrypt = require("bcryptjs");

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // Usa raw SQL para garantir execução imediata antes das queries abaixo (pgm.addColumn seria enfileirado)
  await pgm.db.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false"
  );

  const { rows } = await pgm.db.query("SELECT COUNT(*)::int AS total FROM users");
  const total = rows[0]?.total ?? 0;

  if (total === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await pgm.db.query({
      text: `INSERT INTO users (nome, email, senha_hash, role, must_change_password)
             VALUES ($1, $2, $3, 'admin', true)`,
      values: ["Administrador", "admin@hero-pet.local", hash],
    });
  } else {
    await pgm.db.query(
      "UPDATE users SET must_change_password = true WHERE must_change_password IS DISTINCT FROM true"
    );
  }
};

exports.down = async (pgm) => {
  pgm.dropColumn("users", "must_change_password");
};
