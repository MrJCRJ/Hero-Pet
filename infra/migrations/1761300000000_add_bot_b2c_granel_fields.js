/* eslint-disable camelcase */
/**
 * Migration: suporte B2C/granel para API do bot.
 * - Entities: tipo_cliente para PF/PJ no contexto do bot
 * - Produtos: flags e preço de venda granel
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("entities", {
    tipo_cliente: {
      type: "varchar(20)",
      notNull: true,
      default: "pessoa_juridica",
    },
  });
  pgm.addConstraint("entities", "entities_tipo_cliente_check", {
    check: "tipo_cliente IN ('pessoa_fisica','pessoa_juridica')",
  });
  pgm.addIndex("entities", ["tipo_cliente"], { name: "entities_tipo_cliente_idx" });

  pgm.addColumn("produtos", {
    venda_granel: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    preco_kg_granel: {
      type: "numeric(12,2)",
    },
  });
  pgm.addIndex("produtos", ["venda_granel"], { name: "produtos_venda_granel_idx" });
};

exports.down = (pgm) => {
  pgm.dropIndex("produtos", ["venda_granel"], {
    name: "produtos_venda_granel_idx",
    ifExists: true,
  });
  pgm.dropColumns("produtos", ["venda_granel", "preco_kg_granel"]);

  pgm.dropIndex("entities", ["tipo_cliente"], {
    name: "entities_tipo_cliente_idx",
    ifExists: true,
  });
  pgm.dropConstraint("entities", "entities_tipo_cliente_check", { ifExists: true });
  pgm.dropColumns("entities", ["tipo_cliente"]);
};

