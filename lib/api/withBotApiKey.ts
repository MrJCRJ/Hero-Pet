import { timingSafeEqual } from "node:crypto";
import { auth } from "@/auth";

type RouteContext = {
  params?: Promise<Record<string, string>> | Record<string, string>;
};

// eslint-disable-next-line no-unused-vars
type RouteHandler = (req: Request, ctx?: RouteContext) => Promise<Response>;

function equalsSafe(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function withBotApiKey(
  routeHandler: RouteHandler,
  options?: {
    envVar?: string;
    headerName?: string;
    allowSessionAuth?: boolean;
    allowedRoles?: string[];
  }
): RouteHandler {
  const headerName = (options?.headerName ?? "x-api-key").toLowerCase();

  return async function wrapped(req: Request, ctx?: RouteContext): Promise<Response> {
    const expected =
      process.env[options?.envVar ?? "HEROPET_API_KEY"] ||
      process.env.BOT_INTERNAL_API_KEY;
    const provided = req.headers.get(headerName) ?? "";

    if (expected && provided && equalsSafe(provided, expected)) {
      return routeHandler(req, ctx);
    }

    if (options?.allowSessionAuth) {
      const session = await auth();
      const role = (session?.user as { role?: string } | undefined)?.role;
      const allowedRoles = options.allowedRoles ?? ["admin"];
      if (session?.user && role && allowedRoles.includes(role)) {
        return routeHandler(req, ctx);
      }
    }

    return Response.json({ error: "Unauthorized" }, { status: 401 });
  };
}
