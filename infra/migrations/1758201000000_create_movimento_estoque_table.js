/* eslint-disable camelcase */
/**
 * Migration: create movimento_estoque table
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("movimento_estoque", {
    id: "id",
    produto_id: {
      type: "integer",
      notNull: true,
      references: "produtos",
      onDelete: "CASCADE",
    },
    tipo: { type: "varchar(10)", notNull: true }, // ENTRADA | SAIDA | AJUSTE
    quantidade: { type: "numeric(12,3)", notNull: true },
    valor_unitario: { type: "numeric(12,2)" },
    frete: { type: "numeric(12,2)", notNull: true, default: 0 },
    outras_despesas: { type: "numeric(12,2)", notNull: true, default: 0 },
    valor_total: { type: "numeric(14,2)" },
    documento: { type: "text" },
    observacao: { type: "text" },
    data_movimento: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    usuario: { type: "text" },
  });

  pgm.addConstraint("movimento_estoque", "mov_tipo_check", {
    check: "tipo IN ('ENTRADA','SAIDA','AJUSTE')",
  });

  pgm.createIndex("movimento_estoque", ["produto_id", "data_movimento"], {
    name: "movimento_estoque_produto_dt_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("movimento_estoque", ["produto_id", "data_movimento"], {
    name: "movimento_estoque_produto_dt_idx",
  });
  pgm.dropTable("movimento_estoque");
};
