// pages/api/v1/entities/index.ts
import database from "infra/database";
import ExcelJS from "exceljs";
import { isConnectionError, isRelationMissing } from "lib/errors";
import { classifyAddress, classifyContact } from "lib/validation/completeness";
import {
  SQL_PHONE_FIXED,
  SQL_PHONE_MOBILE,
  SQL_EMAIL,
} from "lib/validation/patterns";
import {
  parseEntityBody,
  deriveDocumentStatus,
} from "lib/schemas/entity";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

type ResWithHeaders = ApiResLike & {
  setHeader: (name: string, value: string) => void;
  end: (chunk?: unknown) => void;
};

async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method === "POST") return postEntity(req, res);
  if (req.method === "GET") return getEntities(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function postEntity(req: ApiReqLike, res: ApiResLike): Promise<void> {
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
    const status = deriveDocumentStatus(rawDigits, documentPending);

    if (rawDigits) {
      const dupQuery = {
        text: `SELECT id FROM entities WHERE document_digits = $1 LIMIT 1`,
        values: [rawDigits],
      };
      const dupResult = await database.query(dupQuery);
      if (dupResult.rows.length) {
        const existingId = (dupResult.rows[0] as { id: number }).id;
        res.status(409).json({
          error: "Documento já cadastrado",
          existing_entity_id: existingId,
        });
        return;
      }
    }

    const insertQuery = {
      text: `INSERT INTO entities
        (name, entity_type, tipo_cliente, document_digits, document_status, document_pending, cep, telefone, email, numero, complemento, observacao, ativo, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW(), NOW())
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
      ],
    };
    const result = await database.query(insertQuery);
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error("POST /entities error", e);
    res.status(500).json({ error: "Internal error" });
  }
}

async function getEntities(req: ApiReqLike, res: ApiResLike): Promise<void> {
  try {
    const q = req.query || {};
    const status = q.status as string | undefined;
    const pending = q.pending;
    const limit = q.limit;
    const meta = q.meta;
    const address_fill = q.address_fill;
    const contact_fill = q.contact_fill;
    const entity_type = q.entity_type;
    const tipo_cliente = q.tipo_cliente;
    const has_orders = q.has_orders;
    const searchQ = q.q;
    const q_name = q.q_name;
    const ativo = q.ativo;

    const clauses: string[] = [];
    const values: unknown[] = [];

    if (status) {
      const allowed = ["pending", "provisional", "valid"];
      if (!allowed.includes(status)) {
        res.status(400).json({ error: "Invalid status filter" });
        return;
      }
      values.push(status);
      clauses.push(`document_status = $${values.length}`);
    }
    if (pending !== undefined) {
      if (!["true", "false"].includes(String(pending))) {
        res.status(400).json({ error: "Invalid pending filter" });
        return;
      }
      values.push(pending === "true");
      clauses.push(`document_pending = $${values.length}`);
    }
    if (entity_type) {
      const allowedTypes = ["PF", "PJ"];
      const entityTypeStr = Array.isArray(entity_type) ? entity_type[0] : entity_type;
      if (!allowedTypes.includes(entityTypeStr as string)) {
        res.status(400).json({ error: "Invalid entity_type filter" });
        return;
      }
      values.push(entityTypeStr);
      clauses.push(`entity_type = $${values.length}`);
    }
    if (tipo_cliente) {
      const allowedCustomerTypes = ["pessoa_fisica", "pessoa_juridica"];
      const customerTypeStr = Array.isArray(tipo_cliente) ? tipo_cliente[0] : tipo_cliente;
      if (!allowedCustomerTypes.includes(customerTypeStr as string)) {
        res.status(400).json({ error: "Invalid tipo_cliente filter" });
        return;
      }
      values.push(customerTypeStr);
      clauses.push(`tipo_cliente = $${values.length}`);
    }
    if (ativo !== undefined) {
      if (!["true", "false"].includes(String(ativo))) {
        res.status(400).json({ error: "Invalid ativo filter" });
        return;
      }
      values.push(String(ativo) === "true");
      clauses.push(`ativo = $${values.length}`);
    }
    if (address_fill) {
      const allowed = ["completo", "parcial", "vazio"];
      if (!allowed.includes(address_fill as string)) {
        res.status(400).json({ error: "Invalid address_fill filter" });
        return;
      }
      if (address_fill === "completo") {
        clauses.push(
          `(cep IS NOT NULL AND cep <> '' AND numero IS NOT NULL AND numero <> '')`
        );
      } else if (address_fill === "parcial") {
        clauses.push(
          `((cep IS NOT NULL AND cep <> '') OR (numero IS NOT NULL AND numero <> '')) AND NOT (cep IS NOT NULL AND cep <> '' AND numero IS NOT NULL AND numero <> '')`
        );
      } else if (address_fill === "vazio") {
        clauses.push(
          `( (cep IS NULL OR cep = '') AND (numero IS NULL OR numero = '') )`
        );
      }
    }
    if (q_name) {
      const text = `%${q_name}%`;
      values.push(text);
      clauses.push(`name ILIKE $${values.length}`);
    } else if (searchQ) {
      const text = `%${searchQ}%`;
      const onlyDigits = String(searchQ || "").replace(/\D+/g, "");
      if (onlyDigits) {
        values.push(text, `%${onlyDigits}%`);
        clauses.push(
          `(name ILIKE $${values.length - 1} OR document_digits LIKE $${values.length})`
        );
      } else {
        values.push(text);
        clauses.push(`name ILIKE $${values.length}`);
      }
    }
    if (has_orders !== undefined && has_orders !== "") {
      const val = String(has_orders);
      if (val === "1" || val === "true" || val === "yes") {
        clauses.push(
          `EXISTS (SELECT 1 FROM pedidos WHERE partner_entity_id = entities.id)`,
        );
      } else if (val === "0" || val === "false" || val === "no") {
        clauses.push(
          `NOT EXISTS (SELECT 1 FROM pedidos WHERE partner_entity_id = entities.id)`,
        );
      }
    }
    if (contact_fill) {
      const allowed = ["completo", "parcial", "vazio"];
      if (!allowed.includes(contact_fill as string)) {
        res.status(400).json({ error: "Invalid contact_fill filter" });
        return;
      }
      const phoneValid = `( (telefone ~ '${SQL_PHONE_FIXED}') OR (telefone ~ '${SQL_PHONE_MOBILE}') )`;
      const emailValid = `(email ~* '${SQL_EMAIL}')`;
      const phoneValidBool = `((${phoneValid}) IS TRUE)`;
      const emailValidBool = `((${emailValid}) IS TRUE)`;
      const hasAnyContact = `((COALESCE(telefone,'') <> '') OR (COALESCE(email,'') <> ''))`;
      if (contact_fill === "completo") {
        clauses.push(`(${phoneValidBool} AND ${emailValidBool})`);
      } else if (contact_fill === "parcial") {
        clauses.push(
          `${hasAnyContact} AND NOT (${phoneValidBool} AND ${emailValidBool})`
        );
      } else if (contact_fill === "vazio") {
        clauses.push(
          `( (telefone IS NULL OR telefone = '') AND (email IS NULL OR email = '') )`
        );
      }
    }

    const format = q.format as string | undefined;
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    if (format === "csv" || format === "xlsx") {
      const exportQuery = {
        text: `SELECT id, name, entity_type, tipo_cliente, document_digits, document_status, document_pending, cep, telefone, email, numero, complemento, observacao, ativo, created_at, updated_at
               FROM entities
               ${where}
               ORDER BY created_at DESC`,
        values,
      };
      const exportResult = await database.query(exportQuery);
      const rows = (exportResult.rows as Record<string, unknown>[]).map((r) => ({
        ...r,
        address_fill: classifyAddress(r),
        contact_fill: classifyContact(r),
      }));
      const headers = [
        "ID",
        "Nome",
        "Perfil",
        "Tipo Cliente",
        "Documento",
        "Status",
        "CEP",
        "Telefone",
        "Email",
        "Número",
        "Complemento",
        "Observações",
        "Ativo",
        "Endereço",
        "Contato",
      ];
      const profileMap = (entityType: string, tipoCliente?: string) => {
        if (entityType === "PJ") return "Fornecedor";
        if (tipoCliente === "pessoa_fisica") return "Cliente Final";
        return "Casa de Ração";
      };
      const statusMap: Record<string, string> = {
        valid: "Válido",
        pending: "Pendente",
        provisional: "Provisório",
      };
      const rowToArr = (r: Record<string, unknown>) => [
        r.id,
        r.name,
        profileMap(String(r.entity_type), String(r.tipo_cliente ?? "")),
        r.tipo_cliente === "pessoa_fisica" ? "Pessoa Física" : "Pessoa Jurídica",
        r.document_digits ?? "",
        statusMap[String(r.document_status)] ?? r.document_status,
        r.cep ?? "",
        r.telefone ?? "",
        r.email ?? "",
        r.numero ?? "",
        r.complemento ?? "",
        r.observacao ?? "",
        r.ativo ? "Sim" : "Não",
        r.address_fill ?? "",
        r.contact_fill ?? "",
      ];

      if (format === "csv") {
        const escape = (v: unknown) => {
          const s = String(v ?? "");
          if (s.includes(",") || s.includes('"') || s.includes("\n"))
            return `"${s.replace(/"/g, '""')}"`;
          return s;
        };
        const lines = [headers.map(escape).join(",")];
        for (const r of rows) lines.push(rowToArr(r).map(escape).join(","));
        const csv = "\uFEFF" + lines.join("\r\n");
        (res as ResWithHeaders).setHeader("Content-Type", "text/csv; charset=utf-8");
        (res as ResWithHeaders).setHeader(
          "Content-Disposition",
          'attachment; filename="entidades.csv"',
        );
        (res as ResWithHeaders).status(200);
        (res as ResWithHeaders).end(csv);
        return;
      }

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Entidades");
      ws.addRow(headers);
      for (const r of rows) ws.addRow(rowToArr(r));
      ws.getColumn(1).width = 8;
      ws.getColumn(2).width = 30;
      ws.getColumn(3).width = 12;
      ws.getColumn(4).width = 18;
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      (res as ResWithHeaders).setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      (res as ResWithHeaders).setHeader(
        "Content-Disposition",
        'attachment; filename="entidades.xlsx"',
      );
      (res as ResWithHeaders).status(200);
      (res as ResWithHeaders).end(buffer);
      return;
    }

    const offsetParam = q.offset;
    const effectiveLimit = Math.min(
      parseInt(String(limit || "100"), 10) || 100,
      500
    );
    const effectiveOffset = Math.max(
      parseInt(String(offsetParam ?? "0"), 10) || 0,
      0
    );
    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;
    const query = {
        text: `SELECT id, name, entity_type, tipo_cliente, document_digits, document_status, document_pending, cep, telefone, email, numero, complemento, observacao, ativo, created_at, updated_at,
             (SELECT COUNT(*)::int FROM pedidos WHERE partner_entity_id = entities.id) AS orders_count
             FROM entities
             ${where}
             ORDER BY created_at DESC
             LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values: [...values, effectiveLimit, effectiveOffset],
    };
    const result = await database.query(query);
    const dataWithFill = (result.rows as Record<string, unknown>[]).map((r) => ({
      ...r,
      address_fill: classifyAddress(r),
      contact_fill: classifyContact(r),
    }));

    if (meta === "1") {
      const countQuery = {
        text: `SELECT COUNT(*)::int AS total FROM entities ${where}`,
        values,
      };
      const countResult = await database.query(countQuery);
      res.status(200).json({
        data: dataWithFill,
        total: (countResult.rows[0] as Record<string, unknown>).total,
      });
      return;
    }
    res.status(200).json(dataWithFill);
  } catch (e) {
    console.error("GET /entities error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (entities table missing)",
        dependency: "database",
        code: err.code,
        action: "Run migrations endpoint or apply migrations before use",
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

export default handler;
