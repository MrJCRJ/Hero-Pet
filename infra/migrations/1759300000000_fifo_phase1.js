/* eslint-disable camelcase */
/**
 * Migration: FIFO Phase 1 (lotes + consumo + colunas de custo reconhecido)
 * - Cria tabelas: estoque_lote, movimento_consumo_lote
 * - Adiciona colunas em movimento_estoque para futura dupla escrita
 * - Não altera lógica de endpoints (feature gate em código de aplicação)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Colunas novas em movimento_estoque (idempotentes via IF NOT EXISTS pattern não suportado direto aqui, confiar em ordem)
  pgm.addColumn("movimento_estoque", {
    custo_unitario_rec: { type: "numeric(14,4)" },
  });
  pgm.addColumn("movimento_estoque", {
    custo_total_rec: { type: "numeric(16,4)" },
  });
  pgm.addColumn("movimento_estoque", {
    origem_tipo: { type: "varchar(20)", notNull: true, default: "MANUAL" },
  });
  pgm.addColumn("movimento_estoque", {
    ref_movimento_id: { type: "integer", references: "movimento_estoque" },
  });
  pgm.addColumn("movimento_estoque", {
    motivo: { type: "varchar(30)" },
  });

  // 2. Tabela estoque_lote
  pgm.createTable("estoque_lote", {
    id: "id",
    produto_id: {
      type: "integer",
      notNull: true,
      references: "produtos",
      onDelete: "CASCADE",
    },
    quantidade_inicial: { type: "numeric(12,3)", notNull: true },
    quantidade_disponivel: { type: "numeric(12,3)", notNull: true },
    custo_unitario: { type: "numeric(14,4)", notNull: true },
    valor_total: { type: "numeric(16,4)", notNull: true },
    origem_tipo: { type: "varchar(20)", notNull: true }, // ENTRADA | AJUSTE_POSITIVO | DEVOLUCAO | IMPORT
    origem_movimento_id: { type: "integer", references: "movimento_estoque" },
    data_entrada: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
    documento: { type: "text" },
    observacao: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.createIndex("estoque_lote", ["produto_id", "data_entrada", "id"], {
    name: "estoque_lote_produto_fifo_idx",
  });
  pgm.createIndex("estoque_lote", ["produto_id", "quantidade_disponivel"], {
    name: "estoque_lote_produto_disponivel_idx",
  });

  // 3. Pivot movimento_consumo_lote
  pgm.createTable("movimento_consumo_lote", {
    id: "id",
    movimento_id: {
      type: "integer",
      notNull: true,
      references: "movimento_estoque",
      onDelete: "CASCADE",
    },
    lote_id: {
      type: "integer",
      notNull: true,
      references: "estoque_lote",
      onDelete: "CASCADE",
    },
    quantidade_consumida: { type: "numeric(12,3)", notNull: true },
    custo_unitario_aplicado: { type: "numeric(14,4)", notNull: true },
    custo_total: { type: "numeric(16,4)", notNull: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.createIndex("movimento_consumo_lote", ["movimento_id"], {
    name: "mov_consumo_mov_idx",
  });
  pgm.createIndex("movimento_consumo_lote", ["lote_id"], {
    name: "mov_consumo_lote_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("movimento_consumo_lote", ["lote_id"], {
    name: "mov_consumo_lote_idx",
  });
  pgm.dropIndex("movimento_consumo_lote", ["movimento_id"], {
    name: "mov_consumo_mov_idx",
  });
  pgm.dropTable("movimento_consumo_lote");

  pgm.dropIndex("estoque_lote", ["produto_id", "quantidade_disponivel"], {
    name: "estoque_lote_produto_disponivel_idx",
  });
  pgm.dropIndex("estoque_lote", ["produto_id", "data_entrada", "id"], {
    name: "estoque_lote_produto_fifo_idx",
  });
  pgm.dropTable("estoque_lote");

  pgm.dropColumns("movimento_estoque", [
    "custo_unitario_rec",
    "custo_total_rec",
    "origem_tipo",
    "ref_movimento_id",
    "motivo",
  ]);
};
