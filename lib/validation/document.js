// Shared document validation & classification logic (backend + frontend)
// Usa constants centralizadas para evitar typos
import { DOCUMENT_STATUS } from "../constants/documentStatus";

export function stripDigits(value = "") {
  return (value || "").replace(/\D+/g, "");
}

export function isValidCPF(raw) {
  const cpf = stripDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(cpf[i], 10) * (len + 1 - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = calc(9);
  const d2 = calc(10);
  return d1 === parseInt(cpf[9], 10) && d2 === parseInt(cpf[10], 10);
}

export function isValidCNPJ(raw) {
  const cnpj = stripDigits(raw);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(cnpj[i], 10) * weights[weights.length - len + i];
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(12);
  const d2 = calc(13);
  return d1 === parseInt(cnpj[12], 10) && d2 === parseInt(cnpj[13], 10);
}

export function classifyDocument(raw, isPendingFlag = false) {
  const digits = stripDigits(raw);
  if (isPendingFlag || !digits)
    return { status: DOCUMENT_STATUS.PENDING, valid: false, type: null };
  if (digits.length <= 11) {
    if (digits.length < 11)
      return { status: DOCUMENT_STATUS.PROVISIONAL, valid: false, type: "CPF" };
    const valid = isValidCPF(digits);
    return {
      status: valid ? DOCUMENT_STATUS.VALID : DOCUMENT_STATUS.PROVISIONAL,
      valid,
      type: "CPF",
    };
  }
  if (digits.length < 14)
    return { status: DOCUMENT_STATUS.PROVISIONAL, valid: false, type: "CNPJ" };
  const valid = isValidCNPJ(digits);
  return {
    status: valid ? DOCUMENT_STATUS.VALID : DOCUMENT_STATUS.PROVISIONAL,
    valid,
    type: "CNPJ",
  };
}
