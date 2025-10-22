/* eslint-disable camelcase */
/**
 * Migration: create despesas table
 * Tabela para registrar despesas operacionais diversas
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Criar enum para categorias de despesa
  pgm.createType("despesa_categoria", [
    "aluguel",
    "energia",
    "agua",
    "internet",
    "telefone",
    "salarios",
    "tributos",
    "marketing",
    "manutencao",
    "transporte",
    "alimentacao",
    "material_escritorio",
    "outros",
  ]);

  // Criar enum para status de pagamento
  pgm.createType("despesa_status", ["pendente", "pago", "cancelado"]);

  pgm.createTable("despesas", {
    id: "id",
    descricao: { type: "text", notNull: true },
    categoria: { type: "despesa_categoria", notNull: true },
    valor: { type: "numeric(14,2)", notNull: true },
    data_vencimento: { type: "date", notNull: true },
    data_pagamento: { type: "date" },
    status: {
      type: "despesa_status",
      notNull: true,
      default: "pendente",
    },
    fornecedor_id: {
      type: "integer",
      references: "entities",
      onDelete: "SET NULL",
    },
    observacao: { type: "text" },
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
  pgm.createIndex("despesas", ["categoria"], {
    name: "despesas_categoria_idx",
  });
  pgm.createIndex("despesas", ["status"], { name: "despesas_status_idx" });
  pgm.createIndex("despesas", ["data_vencimento"], {
    name: "despesas_vencimento_idx",
  });
  pgm.createIndex("despesas", ["fornecedor_id"], {
    name: "despesas_fornecedor_idx",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("despesas", ["fornecedor_id"], {
    name: "despesas_fornecedor_idx",
    ifExists: true,
  });
  pgm.dropIndex("despesas", ["data_vencimento"], {
    name: "despesas_vencimento_idx",
    ifExists: true,
  });
  pgm.dropIndex("despesas", ["status"], {
    name: "despesas_status_idx",
    ifExists: true,
  });
  pgm.dropIndex("despesas", ["categoria"], {
    name: "despesas_categoria_idx",
    ifExists: true,
  });
  pgm.dropTable("despesas", { ifExists: true });
  pgm.dropType("despesa_status", { ifExists: true });
  pgm.dropType("despesa_categoria", { ifExists: true });
};
