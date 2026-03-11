/**
 * Regras compartilhadas de completude endereço/contato (frontend + backend).
 */
import { EMAIL_REGEX, PHONE_FIXED_REGEX, PHONE_MOBILE_REGEX } from "./patterns";

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw).replace(/[^0-9]/g, "");
}

export function isValidPhone(raw: string | null | undefined): boolean {
  const digits = normalizePhone(raw);
  if (digits.length === 10) return PHONE_FIXED_REGEX.test(digits);
  if (digits.length === 11) return PHONE_MOBILE_REGEX.test(digits);
  return false;
}

export function isValidEmail(raw: string | null | undefined): boolean {
  if (!raw) return false;
  return EMAIL_REGEX.test(raw.trim());
}

export type AddressClass = "completo" | "parcial" | "vazio";

export function classifyAddress(
  row: Record<string, unknown> | { cep?: string; numero?: string } | null | undefined
): AddressClass {
  const r = row as { cep?: string; numero?: string } | null | undefined;
  const hasCep = !!r?.cep;
  const hasNumero = !!r?.numero;
  if (hasCep && hasNumero) return "completo";
  if (hasCep || hasNumero) return "parcial";
  return "vazio";
}

export type ContactClass = "completo" | "parcial" | "vazio";

export function classifyContact(
  row: Record<string, unknown> | { telefone?: string; email?: string } | null | undefined
): ContactClass {
  const r = row as { telefone?: string; email?: string } | null | undefined;
  const tel = r?.telefone || "";
  const email = r?.email || "";
  const hasAny = normalizePhone(tel).length > 0 || email.trim().length > 0;
  const validTel = isValidPhone(tel);
  const validEmail = isValidEmail(email);
  if (validTel && validEmail) return "completo";
  if (hasAny) return "parcial";
  return "vazio";
}

export const FILL_CLASS: Record<"completo" | "parcial" | "vazio", string> = {
  completo:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-700 dark:text-green-300 border border-green-600/30",
  parcial:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-600/30",
  vazio:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-gray-400/10 text-gray-600 dark:text-gray-300 border border-gray-500/30",
};
