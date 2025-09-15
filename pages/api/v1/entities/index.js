// pages/api/v1/entities/index.js
import database from "infra/database";
import { classifyDocument as uiClassify, stripDigits as uiStrip } from "components/entity/utils";

// Nota: classifyDocument do front retorna objeto { status, valid, type }
function deriveStatus(rawDigits, pendingFlag) {
  if (pendingFlag || !rawDigits) return "pending";
  const r = uiClassify(rawDigits);
  return r.status;
}

function stripDigits(value = "") {
  return uiStrip(value || "");
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
    if (!["PF", "PJ"].includes(entityType)) return res.status(400).json({ error: "Invalid entity_type" });

    const status = deriveStatus(rawDigits, documentPending);

    const insertQuery = {
      text: `INSERT INTO entities
        (name, entity_type, document_digits, document_status, document_pending, cep, telefone, email, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())
        RETURNING id, name, entity_type, document_digits, document_status, document_pending, cep, telefone, email, created_at, updated_at` ,
      values: [
        name,
        entityType,
        rawDigits,
        status,
        documentPending,
        body.cep || null,
        body.telefone || null,
        body.email || null,
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
  // Será implementado posteriormente
  return res.status(404).json({ error: "Not implemented" });
}

export default handler;
