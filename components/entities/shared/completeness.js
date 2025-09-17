// components/entities/shared/completeness.js
// Centraliza regras de classificação de completude (Endereço / Contato)
// Mantém sem dependências de React para possível reuso no backend futuro.

// Email regex simples porém robusta o suficiente para validação comum (case-insensitive)
// Critérios: algo@algo.dominio (>=2 chars TLD) sem espaços.
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function normalizePhone(raw) {
  if (!raw) return "";
  return String(raw).replace(/[^0-9]/g, "");
}

export function isValidPhone(raw) {
  const digits = normalizePhone(raw);
  // Considera válido >=10 dígitos (fixo ou celular). Não distingue 10/11 aqui.
  return digits.length >= 10;
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
  const telDigits = normalizePhone(row?.telefone);
  const email = row?.email || "";
  const hasTel = telDigits.length > 0;
  const hasValidTel = isValidPhone(row?.telefone);
  const hasEmail = email.trim().length > 0;
  const hasValidEmail = isValidEmail(email);

  // Completo exige ambos válidos
  if (hasValidTel && hasValidEmail) return "completo";
  // Parcial se qualquer um tiver algo (mesmo inválido) ou apenas um válido
  if (hasTel || hasEmail) return "parcial";
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

export function getCompletenessLegend() {
  return {
    completo: {
      title: "Completo",
      desc:
        "Endereço: CEP + Número preenchidos. Contato: Telefone (>=10 dígitos) e Email válido.",
    },
    parcial: {
      title: "Parcial",
      desc:
        "Algum campo informado mas faltando outro ou inválido (ex.: só CEP, só Telefone, email mal formatado).",
    },
    vazio: { title: "Vazio", desc: "Nenhum dos campos informado." },
  };
}
