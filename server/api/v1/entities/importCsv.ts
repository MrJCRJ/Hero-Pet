/**
 * Importa entidades a partir de um CSV.
 * Colunas esperadas (com ou sem cabeçalho): Nome, Perfil, Documento, CEP, Telefone, Email, Número, Complemento, Observações, Ativo
 * Perfil: Cliente ou PF = PF, Fornecedor ou PJ = PJ
 * Documento: vazio ou "(pendente)" = document_pending true
 */

import database from "infra/database";
import { deriveDocumentStatus } from "lib/schemas/entity";
import { stripDigits } from "lib/validation/document";

function parseCSV(content: string): string[][] {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (inQuotes && content[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (inQuotes) {
      field += c;
    } else if (c === "," || c === ";") {
      current.push(field.trim());
      field = "";
    } else if (c === "\n" || c === "\r") {
      current.push(field.trim());
      field = "";
      if (current.some((s) => s.length > 0)) {
        lines.push(current);
      }
      current = [];
      if (c === "\r" && content[i + 1] === "\n") i++;
    } else {
      field += c;
    }
  }
  if (field || current.length > 0) {
    current.push(field.trim());
    if (current.some((s) => s.length > 0)) {
      lines.push(current);
    }
  }
  return lines;
}

const PROFILE_MAP: Record<string, string> = {
  cliente: "PF",
  client: "PF",
  pf: "PF",
  fornecedor: "PJ",
  supplier: "PJ",
  pj: "PJ",
};

function normalizeProfile(val: string): string {
  const v = String(val || "").trim().toLowerCase();
  return PROFILE_MAP[v] || (v ? "PF" : "PF");
}

function normalizeBool(val: string): boolean {
  const v = String(val || "").trim().toLowerCase();
  return v === "1" || v === "sim" || v === "s" || v === "yes" || v === "true" || v === "ativo";
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export async function importEntitiesFromCsv(
  csvContent: string
): Promise<ImportResult> {
  const rows = parseCSV(csvContent);
  if (rows.length === 0) {
    return { imported: 0, skipped: 0, errors: [] };
  }

  const first = rows[0].map((c) => String(c || "").toLowerCase());
  const hasHeader =
    first.some((c) => c.includes("nome")) ||
    first.some((c) => c.includes("name")) ||
    (first[0] !== "" && isNaN(Number(first[0])));

  const dataRows = hasHeader ? rows.slice(1) : rows;

  const colIdx = (name: string): number => {
    const idx = first.findIndex(
      (c) =>
        c.includes(name) ||
        (name === "nome" && c.includes("name")) ||
        (name === "perfil" && (c.includes("profile") || c.includes("tipo")))
    );
    return idx >= 0 ? idx : -1;
  };

  const idxNome = hasHeader ? (colIdx("nome") >= 0 ? colIdx("nome") : 1) : 0;
  const idxPerfil = hasHeader ? (colIdx("perfil") >= 0 ? colIdx("perfil") : 2) : 1;
  const idxDoc = hasHeader ? (colIdx("documento") >= 0 ? colIdx("documento") : 3) : 2;
  const idxCep = hasHeader ? (colIdx("cep") >= 0 ? colIdx("cep") : 5) : 3;
  const idxTel = hasHeader ? (colIdx("telefone") >= 0 ? colIdx("telefone") : 6) : 4;
  const idxEmail = hasHeader ? (colIdx("email") >= 0 ? colIdx("email") : 7) : 5;
  const idxNumero = hasHeader ? (colIdx("numero") >= 0 ? colIdx("numero") : 8) : 6;
  const idxComplemento = hasHeader ? (colIdx("complemento") >= 0 ? colIdx("complemento") : 9) : 7;
  const idxObs = hasHeader ? (colIdx("observa") >= 0 ? colIdx("observa") : 10) : 8;
  const idxAtivo = hasHeader ? (colIdx("ativo") >= 0 ? colIdx("ativo") : 11) : 9;

  const get = (row: string[], i: number): string =>
    i >= 0 && i < row.length ? String(row[i] || "").trim() : "";

  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const nome = idxNome >= 0 ? get(row, idxNome) : get(row, 0);
    if (!nome) {
      result.skipped++;
      continue;
    }

    const perfilRaw = idxPerfil >= 0 ? get(row, idxPerfil) : get(row, 1);
    const entityType = normalizeProfile(perfilRaw);
    const docRaw = idxDoc >= 0 ? get(row, idxDoc) : get(row, 2);
    const documentPending =
      !docRaw ||
      docRaw.toLowerCase() === "(pendente)" ||
      docRaw.toLowerCase() === "pendente";
    const documentDigits = documentPending
      ? ""
      : stripDigits(docRaw).slice(0, 14);
    const status = deriveDocumentStatus(documentDigits, documentPending);

    if (!documentPending && documentDigits) {
      const dup = await database.query({
        text: "SELECT id FROM entities WHERE document_digits = $1 LIMIT 1",
        values: [documentDigits],
      });
      if (dup.rows.length) {
        result.errors.push({
          row: i + (hasHeader ? 2 : 1),
          message: `Documento ${documentDigits} já existe`,
        });
        result.skipped++;
        continue;
      }
    }

    try {
      await database.query({
        text: `INSERT INTO entities
          (name, entity_type, document_digits, document_status, document_pending, cep, telefone, email, numero, complemento, observacao, ativo, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW(), NOW())`,
        values: [
          nome.toUpperCase(),
          entityType,
          documentDigits,
          status,
          documentPending,
          idxCep >= 0 ? get(row, idxCep) || null : null,
          idxTel >= 0 ? get(row, idxTel) || null : null,
          idxEmail >= 0 ? get(row, idxEmail) || null : null,
          idxNumero >= 0 ? get(row, idxNumero) || null : null,
          idxComplemento >= 0 ? get(row, idxComplemento) || null : null,
          idxObs >= 0 ? get(row, idxObs) || null : null,
          idxAtivo >= 0 ? normalizeBool(get(row, idxAtivo)) : true,
        ],
      });
      result.imported++;
    } catch (e) {
      result.errors.push({
        row: i + (hasHeader ? 2 : 1),
        message: e instanceof Error ? e.message : "Erro ao inserir",
      });
      result.skipped++;
    }
  }

  return result;
}
