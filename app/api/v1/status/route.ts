import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/status/index";

export const GET = withPagesHandler(handler);
export const OPTIONS = withPagesHandler(handler);
