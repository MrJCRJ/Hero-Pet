// lib/validation/patterns.js
// Fonte única de verdade para regex de email e telefone (mantém backend e frontend alinhados)

// Email RFC5322 simplificado (case-insensitive)
export const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

// Telefones Brasil
// - Fixo (10 dígitos): DDD !=0 + dígito inicial 2-9 + 7 dígitos
// - Celular (11 dígitos): DDD !=0 + 9 + 8 dígitos
export const PHONE_FIXED_REGEX = /^[1-9][0-9][2-9][0-9]{7}$/; // 10 dígitos
export const PHONE_MOBILE_REGEX = /^[1-9][0-9]9[0-9]{8}$/; // 11 dígitos

// Regex SQL equivalentes (fragmentos) — usar em templates evitando divergência.
export const SQL_PHONE_FIXED = "^[1-9][0-9][2-9][0-9]{7}$";
export const SQL_PHONE_MOBILE = "^[1-9][0-9]9[0-9]{8}$";
export const SQL_EMAIL = "^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$";
