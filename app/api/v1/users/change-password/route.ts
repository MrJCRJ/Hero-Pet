import { withRole } from "@/lib/api/withRole";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/users/change-password";

const base = withPagesHandler(handler);
export const POST = withRole(base);
