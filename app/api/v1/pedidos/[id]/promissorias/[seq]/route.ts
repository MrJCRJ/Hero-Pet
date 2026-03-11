import { withAudit } from "@/lib/api/withAudit";
import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/pedidos/[id]/promissorias/[seq]";

const base = withPagesHandler(handler);
const withAuth = withRole(base);
const getPromissoriaId = (req: Request) => {
  const m = req.url.match(/\/pedidos\/(\d+)\/promissorias\/(\d+)/);
  return m ? `${m[1]}-${m[2]}` : undefined;
};
export const GET = withAuth;
export const PUT = withAuth;
export const POST = withAudit(withAuth, {
  action: "PROMISSORIA_BAIXA",
  entityType: "promissoria",
  getEntityId: getPromissoriaId,
  methods: ["POST"],
});
