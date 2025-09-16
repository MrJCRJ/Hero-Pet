/* Migration: add unique index on document_digits to prevent duplicates (ignoring empties)
 * Decisão: índice parcial evita bloquear múltiplos registros pendentes sem documento.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Índice único parcial (ignora strings vazias)
  pgm.createIndex('entities', 'document_digits', {
    name: 'uniq_entities_document_digits_not_empty',
    unique: true,
    where: "document_digits <> ''"
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('entities', 'document_digits', { name: 'uniq_entities_document_digits_not_empty' });
};
