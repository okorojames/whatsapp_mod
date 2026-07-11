import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import QRCode from "qrcode";
import { startBot, getSocket, latestQR } from "./whatsapp";

const app = new Hono();
const PORT = Number(process.env.PORT) || 4810;

app.use("*", logger());

app.get("/health", (c) => {
  const sock = getSocket();
  const state = sock?.user ? "connected" : "disconnected";
  return c.json({ status: "ok", whatsapp: state });
});

app.get("/qr", async (c) => {
  if (!latestQR) {
    return c.html(
      `<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif"><p>No QR code available yet. Check back after the bot starts.</p></body></html>`,
    );
  }
  const svg = await QRCode.toString(latestQR, { type: "svg" });
  return c.html(
    `<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif"><h2>Scan with WhatsApp</h2>${svg}</body></html>`,
  );
});

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Hono server running on port ${PORT}`);
startBot();
