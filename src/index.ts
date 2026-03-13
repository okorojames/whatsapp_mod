import "dotenv/config";
import express from "express";
import QRCode from "qrcode";
import { getLatestQr, initWhatsApp, client } from "./whatsapp";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get("/health", (_req: express.Request, res: express.Response) => {
  const state = client.info ? "connected" : "disconnected";
  res.json({ status: "ok", whatsapp: state });
});

app.get("/qr", async (_req: express.Request, res: express.Response) => {
  const qr = getLatestQr();

  if (!qr) {
    res.status(404).send(`
      <html>
        <body style="font-family: sans-serif; padding: 24px;">
          <h1>No active QR code</h1>
          <p>The bot may already be authenticated, or it has not emitted a QR yet.</p>
          <p>Check <a href="/health">/health</a> for connection status.</p>
        </body>
      </html>
    `);
    return;
  }

  const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 320 });
  res.send(`
    <html>
      <body style="font-family: sans-serif; padding: 24px; text-align: center;">
        <h1>WhatsApp Login QR</h1>
        <p>Open WhatsApp on your phone → Linked Devices → Link a Device, then scan this QR.</p>
        <img src="${qrDataUrl}" alt="WhatsApp QR code" style="max-width: 320px; width: 100%;" />
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
  initWhatsApp();
});
