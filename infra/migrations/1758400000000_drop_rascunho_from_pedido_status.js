/* eslint-disable camelcase */
/**
 * Migration: drop 'rascunho' from pedido_status enum
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // 1) Atualiza registros antigos para 'confirmado'
  pgm.sql(`UPDATE pedidos SET status = 'confirmado' WHERE status = 'rascunho'`);

  // 2) Criar novo tipo sem 'rascunho'
  pgm.createType("pedido_status_v2", ["confirmado", "cancelado"]);

  // 3) Adicionar coluna temporária com novo tipo e default 'confirmado'
  pgm.addColumn("pedidos", {
    status_new: {
      type: "pedido_status_v2",
      notNull: true,
      default: "confirmado",
    },
  });

  // 4) Copiar valores convertendo via texto
  pgm.sql(`UPDATE pedidos SET status_new = status::text::pedido_status_v2`);

  // 5) Remover índice antigo, dropar coluna antiga e renomear nova coluna
  pgm.dropIndex("pedidos", ["status"], {
    name: "pedidos_status_idx",
    ifExists: true,
  });
  pgm.dropColumn("pedidos", "status");
  pgm.renameColumn("pedidos", "status_new", "status");

  // 6) Recriar índice em cima da nova coluna
  pgm.createIndex("pedidos", ["status"], { name: "pedidos_status_idx" });

  // 7) Remover tipo antigo e renomear o novo
  pgm.dropType("pedido_status", { ifExists: true, cascade: true });
  pgm.sql(`ALTER TYPE pedido_status_v2 RENAME TO pedido_status`);
};

exports.down = async (pgm) => {
  // Reverter pode ser destrutivo; recria enum anterior com 'rascunho'
  pgm.createType("pedido_status_old", ["rascunho", "confirmado", "cancelado"]);
  // adicionar coluna antiga temporária e copiar de volta
  pgm.addColumn("pedidos", {
    status_old: {
      type: "pedido_status_old",
      notNull: true,
      default: "confirmado",
    },
  });
  pgm.sql(`UPDATE pedidos SET status_old = status::text::pedido_status_old`);
  pgm.dropIndex("pedidos", ["status"], {
    name: "pedidos_status_idx",
    ifExists: true,
  });
  pgm.dropColumn("pedidos", "status");
  pgm.renameColumn("pedidos", "status_old", "status");
  pgm.createIndex("pedidos", ["status"], { name: "pedidos_status_idx" });

  // troca índices
  pgm.dropIndex("pedidos", ["status"], {
    name: "pedidos_status_idx",
    ifExists: true,
  });
  pgm.createIndex("pedidos", ["status"], { name: "pedidos_status_idx" });

  // renomeações para restaurar nome original
  pgm.dropType("pedido_status", { ifExists: true, cascade: true });
  pgm.sql(`ALTER TYPE pedido_status_old RENAME TO pedido_status`);
};
