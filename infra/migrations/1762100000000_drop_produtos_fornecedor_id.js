/* eslint-disable camelcase */
/**
 * Remove fornecedor_id de produtos — fornecedores ficam só em produto_fornecedores.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropColumn("produtos", "fornecedor_id", { ifExists: true });
};

exports.down = (pgm) => {
  pgm.addColumn("produtos", {
    fornecedor_id: {
      type: "integer",
      references: "entities",
      onDelete: "SET NULL",
    },
  });
};
