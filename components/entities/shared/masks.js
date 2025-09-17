// Máscaras e helpers de formatação compartilhados (frontend)
import { stripDigits } from "lib/validation/document";

export function isDocumentCnpj(documentValue) {
  return !!documentValue && stripDigits(documentValue).length > 11;
}

export function formatCpfCnpj(raw = "") {
  const digits = stripDigits(raw).slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatCep(raw = "") {
  const digits = stripDigits(raw).slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatTelefone(raw = "") {
  const digits = stripDigits(raw).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
