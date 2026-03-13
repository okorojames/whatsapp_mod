import "dotenv/config";
import express from "express";
import { initWhatsApp, client } from "./whatsapp";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get("/health", (_req: express.Request, res: express.Response) => {
  const state = client.info ? "connected" : "disconnected";
  res.json({ status: "ok", whatsapp: state });
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  initWhatsApp();
});
