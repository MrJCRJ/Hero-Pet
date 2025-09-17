// lib/validation/completeness.js
// Regras compartilhadas de completude endereço/contato (frontend + backend)
import { EMAIL_REGEX, PHONE_FIXED_REGEX, PHONE_MOBILE_REGEX } from "./patterns";

export function normalizePhone(raw) {
  if (!raw) return "";
  return String(raw).replace(/[^0-9]/g, "");
}

// Regras Brasil:
// - 10 dígitos (fixo): DDD (2) + número iniciando 2-9 (total 8).
// - 11 dígitos (celular): DDD (2) + 9 + número (8).
// - DDD não pode iniciar com 0.
export function isValidPhone(raw) {
  const digits = normalizePhone(raw);
  if (digits.length === 10) return PHONE_FIXED_REGEX.test(digits);
  if (digits.length === 11) return PHONE_MOBILE_REGEX.test(digits);
  return false;
}

export function isValidEmail(raw) {
  if (!raw) return false;
  return EMAIL_REGEX.test(raw.trim());
}

export function classifyAddress(row) {
  const hasCep = !!row?.cep;
  const hasNumero = !!row?.numero;
  if (hasCep && hasNumero) return "completo";
  if (hasCep || hasNumero) return "parcial";
  return "vazio";
}

export function classifyContact(row) {
  const tel = row?.telefone || "";
  const email = row?.email || "";
  const hasAny = normalizePhone(tel).length > 0 || email.trim().length > 0;
  const validTel = isValidPhone(tel);
  const validEmail = isValidEmail(email);
  if (validTel && validEmail) return "completo";
  if (hasAny) return "parcial";
  return "vazio";
}

export const FILL_CLASS = {
  completo:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-700 dark:text-green-300 border border-green-600/30",
  parcial:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-600/30",
  vazio:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-gray-400/10 text-gray-600 dark:text-gray-300 border border-gray-500/30",
};
