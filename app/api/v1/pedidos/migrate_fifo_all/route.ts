import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/pedidos/migrate_fifo_all";

export const POST = withRole(withPagesHandler(handler));
