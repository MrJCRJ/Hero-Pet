// Enum de status de documento centralizado
export const DOCUMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PROVISIONAL: "provisional",
  VALID: "valid",
});

export const ALL_DOCUMENT_STATUS = Object.freeze([
  DOCUMENT_STATUS.PENDING,
  DOCUMENT_STATUS.PROVISIONAL,
  DOCUMENT_STATUS.VALID,
]);
