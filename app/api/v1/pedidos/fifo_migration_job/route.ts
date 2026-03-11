import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/pedidos/fifo_migration_job";

export const POST = withRole(withPagesHandler(handler));
