import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { startBot, getSocket } from "./whatsapp";

const app = new Hono();
const PORT = Number(process.env.PORT) || 4810;

app.use("*", logger());

app.get("/health", (c) => {
  const sock = getSocket();
  const state = sock?.user ? "connected" : "disconnected";
  return c.json({ status: "ok", whatsapp: state });
});

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Hono server running on port ${PORT}`);
startBot();
