// Utilidades para componentes de entidade
export function isDocumentCnpj(documentValue) {
  return !!documentValue && documentValue.length > 11;
}

export function stripDigits(value = "") {
  return value.replace(/\D/g, "");
}

export function formatCpfCnpj(raw = "") {
  const digits = stripDigits(raw).slice(0, 14);
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatCep(raw = "") {
  const digits = stripDigits(raw).slice(0, 8);
  // CEP: 00000-000
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatTelefone(raw = "") {
  const digits = stripDigits(raw).slice(0, 11); // Celular pode ter 11
  if (digits.length <= 10) {
    // Fixo: (00) 0000-0000
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  // Celular: (00) 00000-0000
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

// Retorna apenas os dígitos normalizados e a versão formatada simultaneamente
export function normalizeMaskedInput(raw, formatter) {
  const digits = stripDigits(raw);
  return { digits, formatted: formatter(digits) };
}
