/* eslint-disable camelcase */
/**
 * Migration: create pedidos table
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType("pedido_tipo", ["VENDA", "COMPRA"]);
  pgm.createType("pedido_status", ["rascunho", "confirmado", "cancelado"]);

  pgm.createTable("pedidos", {
    id: "id",
    tipo: { type: "pedido_tipo", notNull: true },
    status: { type: "pedido_status", notNull: true, default: "rascunho" },
    partner_entity_id: { type: "integer", references: "entities", onDelete: "SET NULL" },
    partner_document: { type: "text" }, // CPF/CNPJ cru (somente dígitos)
    partner_name: { type: "text" },
    data_emissao: { type: "timestamptz", notNull: true, default: pgm.func("NOW()") },
    data_entrega: { type: "timestamptz" },
    observacao: { type: "text" },
    tem_nota_fiscal: { type: "boolean" },
    parcelado: { type: "boolean" },
    total_bruto: { type: "numeric(14,2)" },
    desconto_total: { type: "numeric(14,2)" },
    total_liquido: { type: "numeric(14,2)" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("NOW()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("NOW()") },
  });

  pgm.createIndex("pedidos", ["tipo"], { name: "pedidos_tipo_idx" });
  pgm.createIndex("pedidos", ["status"], { name: "pedidos_status_idx" });
  pgm.createIndex("pedidos", ["data_emissao"], { name: "pedidos_data_emissao_idx" });
};

exports.down = (pgm) => {
  pgm.dropIndex("pedidos", ["data_emissao"], { name: "pedidos_data_emissao_idx", ifExists: true });
  pgm.dropIndex("pedidos", ["status"], { name: "pedidos_status_idx", ifExists: true });
  pgm.dropIndex("pedidos", ["tipo"], { name: "pedidos_tipo_idx", ifExists: true });
  pgm.dropTable("pedidos", { ifExists: true, cascade: true });
  pgm.dropType("pedido_status", { ifExists: true });
  pgm.dropType("pedido_tipo", { ifExists: true });
};
