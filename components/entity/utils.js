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

// ---------------- Validação Soft de CPF/CNPJ ----------------
export function isValidCPF(raw) {
  const cpf = stripDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

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

// Classifica documento sem bloquear: pending | provisional | valid
export function classifyDocument(raw) {
  const digits = stripDigits(raw);
  if (!digits) return { status: "pending", valid: false, type: null };
  if (digits.length <= 11) {
    if (digits.length < 11) {
      return { status: "provisional", valid: false, type: "CPF" };
    }
    const valid = isValidCPF(digits);
    return { status: valid ? "valid" : "provisional", valid, type: "CPF" };
  }
  // CNPJ branch
  if (digits.length < 14) {
    return { status: "provisional", valid: false, type: "CNPJ" };
  }
  const valid = isValidCNPJ(digits);
  return { status: valid ? "valid" : "provisional", valid, type: "CNPJ" };
}
