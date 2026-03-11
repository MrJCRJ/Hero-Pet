/**
 * Enum de status de documento centralizado.
 */
export const DOCUMENT_STATUS = {
  PENDING: "pending",
  PROVISIONAL: "provisional",
  VALID: "valid",
} as const;

export type DocumentStatus =
  (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export const ALL_DOCUMENT_STATUS = [
  DOCUMENT_STATUS.PENDING,
  DOCUMENT_STATUS.PROVISIONAL,
  DOCUMENT_STATUS.VALID,
] as const;
