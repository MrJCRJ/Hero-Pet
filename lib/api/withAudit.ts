import { auth } from "@/auth";
import { logAuth } from "@/lib/auth/logAuth";

type RouteContext = {
  params?: Promise<Record<string, string>> | Record<string, string>;
};

/* eslint-disable no-unused-vars -- params da assinatura do handler */
type RouteHandler = (req: Request, ctx?: RouteContext) => Promise<Response>;

export type AuditOptions = {
  action: string;
  entityType: string;
  /** Extrai entityId do request (ex: path params). Para POST com id na resposta, use getEntityIdFromBody. */
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura do callback
  getEntityId?: (request: Request) => string | undefined;
  /** Para operações que retornam o id criado no body. Recebe o body parseado. */
  // eslint-disable-next-line no-unused-vars -- params são parte da assinatura do callback
  getEntityIdFromBody?: (responseBody: unknown) => string | undefined;
  /** Só auditar em métodos específicos (ex: ["DELETE"]). Padrão: todos. */
  methods?: string[];
};

/**
 * Encapsula um route handler com registro de auditoria após sucesso.
 * Deve ser aplicado após withRole para garantir sessão disponível.
 */
export function withAudit(
  routeHandler: RouteHandler,
  options: AuditOptions
): RouteHandler {
  const { action, entityType, getEntityId, getEntityIdFromBody, methods } =
    options;

  return async function auditedHandler(
    req: Request,
    ctx?: RouteContext
  ): Promise<Response> {
    const response = await routeHandler(req, ctx);
    const method = req.method;
    if (methods && !methods.includes(method)) return response;
    if (!response.ok) return response;

    let entityId: string | undefined = getEntityId?.(req);
    if (!entityId && getEntityIdFromBody) {
      try {
        const clone = response.clone();
        const jsonBody = await clone.json();
        entityId = getEntityIdFromBody(jsonBody);
      } catch {
        /* ignore */
      }
    }

    try {
      const session = await auth();
      const userId = session?.user
        ? Number((session.user as { id?: string }).id)
        : undefined;
      await logAuth({
        userId: Number.isFinite(userId) ? userId : undefined,
        action,
        entityType,
        entityId: entityId ?? undefined,
      });
    } catch (e) {
      console.warn("[withAudit] Falha ao registrar:", e);
    }
    return response;
  };
}
