// pages/api/v1/entities/index.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import { classifyAddress, classifyContact } from "lib/validation/completeness";
import {
  classifyDocument as sharedClassify,
  stripDigits as sharedStrip,
} from "lib/validation/document";

// Nota: classifyDocument do front retorna objeto { status, valid, type }
function deriveStatus(rawDigits, pendingFlag) {
  const r = sharedClassify(rawDigits, pendingFlag);
  return r.status;
}

function stripDigits(value = "") {
  return sharedStrip(value || "");
}

async function handler(req, res) {
  if (req.method === "POST") return postEntity(req, res);
  if (req.method === "GET") return getEntities(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function postEntity(req, res) {
  try {
    // Next já faz parse de JSON em req.body (desde que content-type correto)
    const body = req.body || {};
    const name = (body.name || "").trim().toUpperCase();
    const entityType = body.entity_type;
    const documentPending = !!body.document_pending;
    const rawDigits = stripDigits(body.document_digits || "");

    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!["PF", "PJ"].includes(entityType))
      return res.status(400).json({ error: "Invalid entity_type" });

    const status = deriveStatus(rawDigits, documentPending);

    // Verifica duplicidade apenas se há dígitos (evita bloquear múltiplos pendentes sem doc)
    if (rawDigits) {
      const dupQuery = {
        text: `SELECT id FROM entities WHERE document_digits = $1 LIMIT 1`,
        values: [rawDigits],
      };
      const dupResult = await database.query(dupQuery);
      if (dupResult.rows.length) {
        return res.status(409).json({ error: "Documento já cadastrado" });
      }
    }

    const insertQuery = {
      text: `INSERT INTO entities
        (name, entity_type, document_digits, document_status, document_pending, cep, telefone, email, numero, complemento, ativo, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), NOW())
        RETURNING id, name, entity_type, document_digits, document_status, document_pending, cep, telefone, email, numero, complemento, ativo, created_at, updated_at`,
      values: [
        name,
        entityType,
        rawDigits,
        status,
        documentPending,
        body.cep || null,
        body.telefone || null,
        body.email || null,
        body.numero || null,
        body.complemento || null,
        body.ativo === false ? false : true,
      ],
    };
    const result = await database.query(insertQuery);
    return res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error("POST /entities error", e);
    return res.status(500).json({ error: "Internal error" });
  }
}

async function getEntities(req, res) {
  try {
    const { status, pending, limit, meta, address_fill, contact_fill } = req.query;
    const clauses = [];
    const values = [];

    if (status) {
      const allowed = ["pending", "provisional", "valid"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: "Invalid status filter" });
      }
      values.push(status);
      clauses.push(`document_status = $${values.length}`);
    }

    if (pending !== undefined) {
      if (!["true", "false"].includes(String(pending))) {
        return res.status(400).json({ error: "Invalid pending filter" });
      }
      values.push(pending === "true");
      clauses.push(`document_pending = $${values.length}`);
    }

    if (address_fill) {
      const allowed = ["completo", "parcial", "vazio"];
      if (!allowed.includes(address_fill)) {
        return res.status(400).json({ error: "Invalid address_fill filter" });
      }
      // Filtro em nível de SQL usando mesma lógica do summary para performance
      if (address_fill === "completo") {
        clauses.push(`(cep IS NOT NULL AND cep <> '' AND numero IS NOT NULL AND numero <> '')`);
      } else if (address_fill === "parcial") {
        clauses.push(`((cep IS NOT NULL AND cep <> '') OR (numero IS NOT NULL AND numero <> '')) AND NOT (cep IS NOT NULL AND cep <> '' AND numero IS NOT NULL AND numero <> '')`);
      } else if (address_fill === "vazio") {
        clauses.push(`( (cep IS NULL OR cep = '') AND (numero IS NULL OR numero = '') )`);
      }
    }
    if (contact_fill) {
      const allowed = ["completo", "parcial", "vazio"];
      if (!allowed.includes(contact_fill)) {
        return res.status(400).json({ error: "Invalid contact_fill filter" });
      }
      // Regras equivalentes à isValidPhone (JS):
      // fixo 10 dígitos: DDD !=0, terceiro dígito 2-9 => ^[1-9][0-9][2-9][0-9]{7}$
      // celular 11 dígitos: DDD !=0, terceiro dígito 9 => ^[1-9][0-9]9[0-9]{8}$
      // Email válido replicando regex JS case-insensitive.
      const phoneValid = `( (telefone ~ '^[1-9][0-9][2-9][0-9]{7}$') OR (telefone ~ '^[1-9][0-9]9[0-9]{8}$') )`;
      const emailValid = `email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'`;
      if (contact_fill === "completo") {
        clauses.push(`(${phoneValid} AND ${emailValid})`);
      } else if (contact_fill === "parcial") {
        clauses.push(`((telefone IS NOT NULL AND telefone <> '') OR (email IS NOT NULL AND email <> '')) AND NOT (${phoneValid} AND ${emailValid})`);
      } else if (contact_fill === "vazio") {
        clauses.push(`( (telefone IS NULL OR telefone = '') AND (email IS NULL OR email = '') )`);
      }
    }

    const effectiveLimit = Math.min(parseInt(limit || "100", 10) || 100, 500);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const query = {
      text: `SELECT id, name, entity_type, document_digits, document_status, document_pending, cep, telefone, email, numero, complemento, ativo, created_at, updated_at
             FROM entities
             ${where}
             ORDER BY created_at DESC
             LIMIT ${effectiveLimit}`,
      values,
    };
    const result = await database.query(query);
    // Anexar campos calculados de completude (consistentes com front)
    const dataWithFill = result.rows.map(r => ({
      ...r,
      address_fill: classifyAddress(r),
      contact_fill: classifyContact(r),
    }));

    if (meta === "1") {
      // total sem limit para contagem real dos filtros
      const countQuery = {
        text: `SELECT COUNT(*)::int AS total FROM entities ${where}`,
        values,
      };
      const countResult = await database.query(countQuery);
      return res
        .status(200)
        .json({ data: dataWithFill, total: countResult.rows[0].total });
    }

    return res.status(200).json(dataWithFill);
  } catch (e) {
    console.error("GET /entities error", e);
    if (isRelationMissing(e)) {
      return res.status(503).json({
        error: "Schema not migrated (entities table missing)",
        dependency: "database",
        code: e.code,
        action: "Run migrations endpoint or apply migrations before use",
      });
    }
    if (isConnectionError(e)) {
      return res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: e.code,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
      });
    }
    return res.status(500).json({ error: "Internal error" });
  }
}

export default handler;
