import database from "infra/database.js";

/**
 * Registra ação de auditoria na tabela log.
 * Usar em handlers de APIs críticos (criação/exclusão de pedidos, alterações sensíveis).
 */
export async function logAuth(params: {
  userId?: number | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await database.query({
      text: `INSERT INTO log (user_id, action, entity_type, entity_id, details)
             VALUES ($1, $2, $3, $4, $5)`,
      values: [
        params.userId ?? null,
        params.action,
        params.entityType ?? null,
        params.entityId ?? null,
        params.details ? JSON.stringify(params.details) : null,
      ],
    });
  } catch (e) {
    console.warn("[logAuth] Falha ao registrar:", e);
  }
}
