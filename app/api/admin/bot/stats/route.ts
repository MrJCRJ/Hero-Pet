import { withBotApiKey } from "@/lib/api/withBotApiKey";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/admin/bot/stats";

const base = withPagesHandler(handler);
export const GET = withBotApiKey(base, { allowSessionAuth: true, allowedRoles: ["admin"] });
