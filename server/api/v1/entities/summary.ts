// pages/api/v1/entities/summary.ts
import database from "infra/database";
import {
  SQL_PHONE_FIXED,
  SQL_PHONE_MOBILE,
  SQL_EMAIL,
} from "lib/validation/patterns";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

function computePercentages(
  map: Record<string, number>,
  totalCount: number
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map || {})) {
    out[k] = totalCount ? Number(((v / totalCount) * 100).toFixed(1)) : 0;
  }
  return out;
}

export default async function summary(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return;
  }
  try {
    const byStatus = await database.query({
      text: `SELECT document_status AS status, COUNT(*)::int AS count FROM entities GROUP BY document_status`,
    });
    const byPending = await database.query({
      text: `SELECT document_pending AS pending, COUNT(*)::int AS count FROM entities GROUP BY document_pending`,
    });
    const byAddressFill = await database.query({
      text: `SELECT
        CASE
          WHEN cep IS NOT NULL AND cep <> '' AND numero IS NOT NULL AND numero <> '' THEN 'completo'
          WHEN ( (cep IS NOT NULL AND cep <> '') OR (numero IS NOT NULL AND numero <> '') ) THEN 'parcial'
          ELSE 'vazio'
        END AS fill,
        COUNT(*)::int AS count
      FROM entities
      GROUP BY 1`,
    });
    const byContactFill = await database.query({
      text: `SELECT
        CASE
          WHEN ( (telefone ~ '${SQL_PHONE_FIXED}') OR (telefone ~ '${SQL_PHONE_MOBILE}') ) AND (email ~* '${SQL_EMAIL}') THEN 'completo'
          WHEN ( (telefone IS NOT NULL AND telefone <> '') OR (email IS NOT NULL AND email <> '') ) THEN 'parcial'
          ELSE 'vazio'
        END AS fill,
        COUNT(*)::int AS count
      FROM entities
      GROUP BY 1`,
    });
    const total = await database.query(
      "SELECT COUNT(*)::int AS total FROM entities"
    );
    const byEntityType = await database.query({
      text: `SELECT entity_type, COUNT(*)::int AS count FROM entities GROUP BY entity_type`,
    });
    const byCustomerType = await database.query({
      text: `SELECT tipo_cliente, COUNT(*)::int AS count FROM entities WHERE entity_type = 'PF' GROUP BY tipo_cliente`,
    });
    const totalRow = total.rows[0] as Record<string, unknown>;
    const totalCount = totalRow.total as number;
    const countPf =
      (byEntityType.rows.find((r) => (r as { entity_type: string }).entity_type === "PF") as { count: number } | undefined)?.count ?? 0;
    const countPj =
      (byEntityType.rows.find((r) => (r as { entity_type: string }).entity_type === "PJ") as { count: number } | undefined)?.count ?? 0;
    const countReseller =
      (byCustomerType.rows.find((r) => (r as { tipo_cliente: string }).tipo_cliente === "pessoa_juridica") as { count: number } | undefined)?.count ?? 0;
    const countFinalCustomer =
      (byCustomerType.rows.find((r) => (r as { tipo_cliente: string }).tipo_cliente === "pessoa_fisica") as { count: number } | undefined)?.count ?? 0;
    const ensureCats = (map: Record<string, number>) => ({
      completo: map.completo || 0,
      parcial: map.parcial || 0,
      vazio: map.vazio || 0,
    });
    const json: Record<string, unknown> = {
      total: totalRow.total,
      count_pf: countPf,
      count_pj: countPj,
      count_reseller: countReseller,
      count_final_customer: countFinalCustomer,
      by_status: (byStatus.rows as Array<Record<string, unknown>>).reduce(
        (acc, r) => {
          acc[r.status as string] = r.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      by_pending: (byPending.rows as Array<Record<string, unknown>>).reduce(
        (acc, r) => {
          acc[String(r.pending)] = r.count;
          return acc;
        },
        {} as Record<string, number>
      ),
      by_address_fill: ensureCats(
        (byAddressFill.rows as Array<Record<string, unknown>>).reduce<Record<string, number>>(
          (acc, r) => {
            acc[r.fill as string] = r.count as number;
            return acc;
          },
          {}
        )
      ),
      by_contact_fill: ensureCats(
        (byContactFill.rows as Array<Record<string, unknown>>).reduce<Record<string, number>>(
          (acc, r) => {
            acc[r.fill as string] = r.count as number;
            return acc;
          },
          {}
        )
      ),
    };
    (json as Record<string, Record<string, number>>).percent_address_fill =
      computePercentages(
        json.by_address_fill as Record<string, number>,
        totalCount
      );
    (json as Record<string, Record<string, number>>).percent_contact_fill =
      computePercentages(
        json.by_contact_fill as Record<string, number>,
        totalCount
      );
    res.status(200).json(json);
  } catch (e) {
    console.error("GET /entities/summary error", e);
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
