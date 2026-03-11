import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/estoque/saldos_fifo/index";

export const GET = withRole(withPagesHandler(handler));
