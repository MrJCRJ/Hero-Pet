import { auth } from "@/auth";

type RouteContext = {
  params?: Promise<Record<string, string>> | Record<string, string>;
};

/* eslint-disable-next-line no-unused-vars */
type RouteHandler = (req: Request, ctx?: RouteContext) => Promise<Response>;

const ALL_ROLES: string[] = ["admin", "operador", "visualizador"];
const WRITE_ROLES: string[] = ["admin", "operador"];
const ADMIN_ONLY: string[] = ["admin"];

/**
 * Roles permitidas por método HTTP.
 * GET/HEAD: qualquer autenticado.
 * POST/PUT: admin ou operador.
 * DELETE: apenas admin.
 */
const DEFAULT_ROLES: Record<string, string[]> = {
  GET: ALL_ROLES,
  HEAD: ALL_ROLES,
  POST: WRITE_ROLES,
  PUT: WRITE_ROLES,
  PATCH: WRITE_ROLES,
  DELETE: ADMIN_ONLY,
  OPTIONS: ALL_ROLES,
};

/**
 * Encapsula um route handler com verificação de autenticação e role.
 * @param routeHandler - Handler retornado por withPagesHandler ou similar
 * @param allowedRoles - Roles permitidas. Array para todos os métodos, ou objeto por método
 */
export function withRole(
  routeHandler: RouteHandler,
  allowedRoles: string[] | Record<string, string[]> = DEFAULT_ROLES
): RouteHandler {
  const getRoles = (method: string): string[] => {
    if (Array.isArray(allowedRoles)) return allowedRoles;
    const roles = allowedRoles[method] ?? allowedRoles["*"] ?? DEFAULT_ROLES[method] ?? ALL_ROLES;
    return roles as string[];
  };

  return async function wrappedHandler(
    req: Request,
    ctx?: RouteContext
  ): Promise<Response> {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Não autenticado" }, {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const role = (session.user as { role?: string }).role;
    if (!role) {
      return Response.json({ error: "Acesso negado" }, {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const roles = getRoles(req.method);
    if (!roles.includes(role)) {
      return Response.json({ error: "Acesso negado" }, {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    return routeHandler(req, ctx);
  };
}
