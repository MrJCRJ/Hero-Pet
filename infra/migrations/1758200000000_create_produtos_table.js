/* eslint-disable camelcase */
/**
 * Migration: create produtos table
 * - custo não persistido; derivado dos movimentos (futuro)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("produtos", {
    id: "id",
    nome: { type: "text", notNull: true },
    descricao: { type: "text" },
    codigo_barras: { type: "text" }, // unique quando não nulo
    categoria: { type: "text" },
    fornecedor_id: {
      type: "integer",
      references: "entities",
      onDelete: "SET NULL",
    },
    preco_tabela: { type: "numeric(12,2)" },
    markup_percent_default: { type: "numeric(5,2)" },
    estoque_minimo: { type: "numeric(12,3)" },
    ativo: { type: "boolean", notNull: true, default: true },
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

  // Índices
  pgm.createIndex("produtos", "codigo_barras", {
    name: "produtos_codigo_barras_uniq_not_null",
    unique: true,
    where: "codigo_barras IS NOT NULL",
  });
  pgm.addIndex("produtos", ["nome"], { name: "produtos_nome_idx" });
  pgm.addIndex("produtos", ["ativo"], { name: "produtos_ativo_idx" });
};

exports.down = (pgm) => {
  pgm.dropIndex("produtos", ["ativo"], { name: "produtos_ativo_idx" });
  pgm.dropIndex("produtos", ["nome"], { name: "produtos_nome_idx" });
  pgm.dropIndex("produtos", "codigo_barras", {
    name: "produtos_codigo_barras_uniq_not_null",
    ifExists: true,
  });
  pgm.dropTable("produtos");
};
