import "dotenv/config";
import express from "express";
import { initWhatsApp, client } from "./whatsapp";

const app = express();
const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL; // Set automatically by Render

app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  const state = client.info ? "connected" : "disconnected";
  res.json({ status: "ok", whatsapp: state });
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  initWhatsApp();

  // Self-ping to prevent Render free tier from sleeping
  if (RENDER_URL) {
    const PING_INTERVAL = 13 * 60 * 1000; // 13 minutes
    setInterval(async () => {
      try {
        const res = await fetch(`${RENDER_URL}/health`);
        console.log(`[Keep-alive] Pinged ${RENDER_URL}/health — ${res.status}`);
      } catch (err) {
        console.error("[Keep-alive] Ping failed:", err);
      }
    }, PING_INTERVAL);
    console.log(
      `Keep-alive ping enabled (every 13 min → ${RENDER_URL}/health)`,
    );
  }
});
