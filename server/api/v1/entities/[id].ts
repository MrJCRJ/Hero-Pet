import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import {
  parseEntityBody,
  deriveDocumentStatus,
} from "lib/schemas/entity";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  const id = req.query?.id;
  if (!id || isNaN(Number(id))) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const idNum = Number(id);
  if (req.method === "GET") return getEntity(req, res, idNum);
  if (req.method === "PUT") return updateEntity(req, res, idNum);
  if (req.method === "DELETE") return deleteEntity(req, res, idNum);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function getEntity(
  req: ApiReqLike,
  res: ApiResLike,
  id: number
): Promise<void> {
  try {
    const q = {
      text: `SELECT id, name, entity_type, tipo_cliente, document_digits, document_status, document_pending, cep, telefone, email, numero, complemento, observacao, ativo, created_at, updated_at FROM entities WHERE id = $1 LIMIT 1`,
      values: [id],
    };
    const r = await database.query(q);
    if (!r.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(200).json(r.rows[0]);
  } catch (e) {
    console.error("GET /entities/[id] error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (entities table missing)",
        dependency: "database",
        code: err.code,
      });
      return;
    }
    if (isConnectionError(e)) {
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
      });
      return;
    }
    res.status(500).json({ error: "Internal error" });
  }
}

async function updateEntity(
  req: ApiReqLike,
  res: ApiResLike,
  id: number
): Promise<void> {
  try {
    const parsed = parseEntityBody(req.body);
    if (!parsed.success) {
      const msg =
        (parsed.error as { issues?: Array<{ message?: string }> }).issues?.[0]
          ?.message || "Validation failed";
      res.status(400).json({ error: msg });
      return;
    }
    const data = parsed.data;
    const name = data.name;
    const entityType = data.entity_type;
    const documentPending = !!data.document_pending;
    const rawDigits = data.document_digits;

    const existing = await database.query({
      text: `SELECT id, document_digits FROM entities WHERE id = $1 LIMIT 1`,
      values: [id],
    });
    if (!existing.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const existingRow = existing.rows[0] as Record<string, unknown>;
    if (
      rawDigits &&
      rawDigits !== existingRow.document_digits
    ) {
      const dup = await database.query({
        text: `SELECT id FROM entities WHERE document_digits = $1 LIMIT 1`,
        values: [rawDigits],
      });
      if (dup.rows.length) {
        const existingId = (dup.rows[0] as { id: number }).id;
        res.status(409).json({
          error: "Documento já cadastrado",
          existing_entity_id: existingId,
        });
        return;
      }
    }

    const status = deriveDocumentStatus(rawDigits, documentPending);

    const updateQuery = {
      text: `UPDATE entities
             SET name=$1, entity_type=$2, tipo_cliente=$3, document_digits=$4, document_status=$5, document_pending=$6,
                 cep=$7, telefone=$8, email=$9, numero=$10, complemento=$11, observacao=$12, ativo=$13, updated_at=NOW()
             WHERE id=$14
             RETURNING id, name, entity_type, tipo_cliente, document_digits, document_status, document_pending, cep, telefone, email, numero, complemento, observacao, ativo, created_at, updated_at`,
      values: [
        name,
        entityType,
        data.tipo_cliente || "pessoa_juridica",
        rawDigits,
        status,
        documentPending,
        data.cep || null,
        data.telefone || null,
        data.email || null,
        data.numero || null,
        data.complemento || null,
        (data.observacao as string)?.trim() || null,
        data.ativo === false ? false : true,
        id,
      ],
    };
    const result = await database.query(updateQuery);
    res.status(200).json(result.rows[0]);
  } catch (e) {
    console.error("PUT /entities/[id] error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (entities table missing)",
        dependency: "database",
        code: err.code,
      });
      return;
    }
    if (isConnectionError(e)) {
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
      });
      return;
    }
    res.status(500).json({ error: "Internal error" });
  }
}

async function deleteEntity(
  req: ApiReqLike,
  res: ApiResLike,
  id: number
): Promise<void> {
  try {
    const del = await database.query({
      text: `DELETE FROM entities WHERE id=$1 RETURNING id`,
      values: [id],
    });
    if (!del.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(200).json({ deleted: true });
  } catch (e) {
    console.error("DELETE /entities/[id] error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (entities table missing)",
        dependency: "database",
        code: err.code,
      });
      return;
    }
    if (isConnectionError(e)) {
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
      });
      return;
    }
    res.status(500).json({ error: "Internal error" });
  }
}
