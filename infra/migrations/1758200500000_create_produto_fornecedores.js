/* Migration: create produto_fornecedores (N:N produtos x entities-PJ) */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("produto_fornecedores", {
    id: "id",
    produto_id: {
      type: "integer",
      notNull: true,
      references: "produtos",
      onDelete: "cascade",
    },
    entity_id: {
      type: "integer",
      notNull: true,
      references: "entities",
      onDelete: "restrict",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });
  pgm.addConstraint("produto_fornecedores", "uniq_produto_fornecedor", {
    unique: ["produto_id", "entity_id"],
  });
  pgm.createIndex("produto_fornecedores", ["produto_id"]);
  pgm.createIndex("produto_fornecedores", ["entity_id"]);
};

exports.down = (pgm) => {
  pgm.dropTable("produto_fornecedores");
};
