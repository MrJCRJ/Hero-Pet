/* eslint-disable camelcase */
/**
 * Migration: estoque simplificado (custo médio)
 * Mantém estruturas FIFO legadas, mas adiciona runtime simplificado.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("produtos", {
    estoque_kg: { type: "numeric(12,3)", notNull: true, default: 0 },
    custo_medio_kg: { type: "numeric(12,4)", notNull: true, default: 0 },
  });

  pgm.createTable("movimentacoes_estoque", {
    id: "id",
    produto_id: {
      type: "integer",
      notNull: true,
      references: "produtos",
      onDelete: "CASCADE",
    },
    tipo: { type: "varchar(10)", notNull: true }, // entrada | saida
    quantidade_kg: { type: "numeric(12,3)", notNull: true },
    preco_unitario_kg: { type: "numeric(12,4)" },
    observacao: { type: "text" },
    ref_pedido_id: { type: "integer", references: "pedidos", onDelete: "SET NULL" },
    data_movimento: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.addConstraint("movimentacoes_estoque", "movimentacoes_estoque_tipo_check", {
    check: "tipo IN ('entrada','saida')",
  });
  pgm.createIndex("movimentacoes_estoque", ["produto_id", "data_movimento"], {
    name: "mov_estoque_produto_data_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("movimentacoes_estoque", ["produto_id", "data_movimento"], {
    name: "mov_estoque_produto_data_idx",
    ifExists: true,
  });
  pgm.dropConstraint("movimentacoes_estoque", "movimentacoes_estoque_tipo_check", { ifExists: true });
  pgm.dropTable("movimentacoes_estoque", { ifExists: true });
  pgm.dropColumns("produtos", ["estoque_kg", "custo_medio_kg"]);
};

