import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  try {
    const hasCol = await database.query({
      text: `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'fabricante' LIMIT 1`,
    });
    if (!hasCol.rows?.length) {
      return void res.status(200).json([]);
    }
    const r = await database.query({
      text: `SELECT DISTINCT fabricante FROM produtos WHERE fabricante IS NOT NULL AND TRIM(fabricante) <> '' ORDER BY fabricante`,
    });
    const fabricantes = (r.rows as Array<{ fabricante: string }>).map(
      (row) => row.fabricante
    );
    return void res.status(200).json(fabricantes);
  } catch (e) {
    const err = e as { code?: string };
    if (err?.code === "42703") return void res.status(200).json([]);
    console.error("GET /produtos/fabricantes error", e);
    if (isRelationMissing(e)) {
      return void res.status(503).json({
        error: "Schema not migrated",
        dependency: "database",
        code: err.code,
      });
    }
    if (isConnectionError(e)) {
      return void res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
      });
    }
    return void res.status(500).json({ error: "Internal error" });
  }
}
