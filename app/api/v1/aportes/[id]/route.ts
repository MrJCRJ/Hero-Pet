import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/aportes/[id]";

const base = withPagesHandler(handler);
export const DELETE = withRole(base);
export const PUT = withRole(base);
