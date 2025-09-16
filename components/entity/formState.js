import {
  stripDigits,
  classifyDocument,
  formatCpfCnpj,
  formatCep,
  formatTelefone,
  isDocumentCnpj,
} from "./utils";

export const DIGIT_LIMITS = Object.freeze({
  documento: 14,
  cep: 8,
  telefone: 11,
});
export const DIGIT_FIELDS = Object.keys(DIGIT_LIMITS);
export const UPPER_FIELDS = new Set(["nome"]);
export const ENTITY_LABEL = { client: "Cliente", supplier: "Fornecedor" };

export function createInitialEntityForm() {
  return {
    entityType: "client",
    nome: "",
    documento: "",
    documento_pendente: false,
    document_status: "pending",
    cep: "",
    telefone: "",
    email: "",
    complemento: "",
    numero: "",
    ativo: true,
  };
}

export function applyChange(prev, { name, value, type, checked }) {
  if (type === "radio" && name === "entityType") {
    return { ...prev, entityType: value };
  }

  if (type === "checkbox" && name === "documento_pendente") {
    return {
      ...prev,
      documento_pendente: checked,
      documento: checked ? "" : prev.documento,
      document_status: checked ? "pending" : prev.document_status,
    };
  }

  if (type === "checkbox") {
    return { ...prev, [name]: checked };
  }

  if (DIGIT_FIELDS.includes(name)) {
    const digits = stripDigits(value).slice(0, DIGIT_LIMITS[name]);
    return { ...prev, [name]: digits };
  }

  if (UPPER_FIELDS.has(name)) {
    return { ...prev, [name]: value.toUpperCase() };
  }

  return { ...prev, [name]: value };
}

export function applyDocumentBlur(prev) {
  if (prev.documento_pendente) return prev;
  const digits = stripDigits(prev.documento);
  const { status } = classifyDocument(digits);
  return { ...prev, document_status: status };
}

export function computeDerived(form) {
  return {
    isClient: form.entityType === "client",
    documentIsCnpj: isDocumentCnpj(form.documento),
    formatted: {
      ...form,
      documento: formatCpfCnpj(form.documento),
      cep: formatCep(form.cep),
      telefone: formatTelefone(form.telefone),
    },
  };
}

export function getEntityLabel(entityType) {
  return ENTITY_LABEL[entityType] || "Entidade";
}
