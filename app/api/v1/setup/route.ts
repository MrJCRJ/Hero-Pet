import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/v1/setup";

export const GET = withPagesHandler(handler);
export const POST = withPagesHandler(handler);
