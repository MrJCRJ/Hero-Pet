/* eslint-disable camelcase */
/**
 * Migration: Adicionar campos para sistema de promissórias
 * Substituir campo 'parcelado' por sistema completo de promissórias com:
 * - Quantidade de parcelas
 * - Data de vencimento da primeira parcela
 * - Valor por parcela (calculado automaticamente)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Adicionar novos campos para promissórias
  pgm.addColumn("pedidos", {
    numero_promissorias: { type: "integer", default: 1 }, // Quantidade de promissórias (1 = à vista)
    data_primeira_promissoria: { type: "date" }, // Data de vencimento da primeira promissória
    valor_por_promissoria: { type: "numeric(14,2)" }, // Valor calculado por promissória
  });

  // Migrar dados existentes: se parcelado = true, definir como 2 promissórias
  pgm.sql(`
    UPDATE pedidos 
    SET numero_promissorias = CASE 
      WHEN parcelado = true THEN 2 
      ELSE 1 
    END
  `);

  // Criar índice para consultas por promissórias
  pgm.createIndex("pedidos", ["numero_promissorias"], { name: "pedidos_numero_promissorias_idx" });
  pgm.createIndex("pedidos", ["data_primeira_promissoria"], { name: "pedidos_data_primeira_promissoria_idx" });
};

exports.down = (pgm) => {
  pgm.dropIndex("pedidos", ["data_primeira_promissoria"], { name: "pedidos_data_primeira_promissoria_idx", ifExists: true });
  pgm.dropIndex("pedidos", ["numero_promissorias"], { name: "pedidos_numero_promissorias_idx", ifExists: true });

  pgm.dropColumn("pedidos", "valor_por_promissoria", { ifExists: true });
  pgm.dropColumn("pedidos", "data_primeira_promissoria", { ifExists: true });
  pgm.dropColumn("pedidos", "numero_promissorias", { ifExists: true });
};