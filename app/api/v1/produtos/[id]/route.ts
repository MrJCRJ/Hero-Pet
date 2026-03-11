import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/produtos/[id]";

const base = withPagesHandler(handler);
export const PUT = withRole(base);
export const DELETE = withRole(base);
