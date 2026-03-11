import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/entities/index";

const base = withPagesHandler(handler);
export const GET = withRole(base);
export const POST = withRole(base);
