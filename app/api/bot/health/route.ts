import { withBotApiKey } from "@/lib/api/withBotApiKey";
import { withPagesHandler } from "@/lib/server/withPagesHandler";
import handler from "@/server/api/bot/health/index";

const base = withPagesHandler(handler);
export const GET = withBotApiKey(base);
