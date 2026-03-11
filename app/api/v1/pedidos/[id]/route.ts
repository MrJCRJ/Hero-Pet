import { withAudit } from "@/lib/api/withAudit";
import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/pedidos/[id]";

const base = withPagesHandler(handler);
const withAuth = withRole(base);
const getPedidoId = (req: Request) => req.url.match(/\/pedidos\/(\d+)/)?.[1];
export const GET = withAuth;
export const PUT = withAuth;
export const DELETE = withAudit(withAuth, {
  action: "PEDIDO_DELETE",
  entityType: "pedido",
  getEntityId: getPedidoId,
  methods: ["DELETE"],
});
