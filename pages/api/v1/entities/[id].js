import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import { classifyDocument, stripDigits } from "lib/validation/document";

function deriveStatus(rawDigits, pendingFlag) {
  const r = classifyDocument(rawDigits, pendingFlag);
  return r.status;
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (req.method === "PUT") return updateEntity(req, res, Number(id));
  if (req.method === "DELETE") return deleteEntity(req, res, Number(id));
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function updateEntity(req, res, id) {
  try {
    const body = req.body || {};
    const name = (body.name || "").trim().toUpperCase();
    const entityType = body.entity_type;
    const documentPending = !!body.document_pending;
    const rawDigits = stripDigits(body.document_digits || "");

    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!["PF", "PJ"].includes(entityType))
      return res.status(400).json({ error: "Invalid entity_type" });

    // verifica existência
    const existing = await database.query({
      text: `SELECT id, document_digits FROM entities WHERE id = $1 LIMIT 1`,
      values: [id],
    });
    if (!existing.rows.length)
      return res.status(404).json({ error: "Not found" });

    // checa duplicidade se modificar documento e não vazio
    if (rawDigits && rawDigits !== existing.rows[0].document_digits) {
      const dup = await database.query({
        text: `SELECT id FROM entities WHERE document_digits = $1 LIMIT 1`,
        values: [rawDigits],
      });
      if (dup.rows.length)
        return res.status(409).json({ error: "Documento já cadastrado" });
    }

    const status = deriveStatus(rawDigits, documentPending);

    const updateQuery = {
      text: `UPDATE entities
             SET name=$1, entity_type=$2, document_digits=$3, document_status=$4, document_pending=$5,
                 cep=$6, telefone=$7, email=$8, numero=$9, complemento=$10, ativo=$11, updated_at=NOW()
             WHERE id=$12
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
        id,
      ],
    };
    const result = await database.query(updateQuery);
    return res.status(200).json(result.rows[0]);
  } catch (e) {
    console.error("PUT /entities/[id] error", e);
    if (isRelationMissing(e)) {
      return res.status(503).json({
        error: "Schema not migrated (entities table missing)",
        dependency: "database",
        code: e.code,
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

async function deleteEntity(req, res, id) {
  try {
    const del = await database.query({
      text: `DELETE FROM entities WHERE id=$1 RETURNING id`,
      values: [id],
    });
    if (!del.rows.length)
      return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ deleted: true });
  } catch (e) {
    console.error("DELETE /entities/[id] error", e);
    if (isRelationMissing(e)) {
      return res.status(503).json({
        error: "Schema not migrated (entities table missing)",
        dependency: "database",
        code: e.code,
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
