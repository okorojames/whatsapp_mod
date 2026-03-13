import { existsSync } from "node:fs";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { handleMessage, startStickerScanner } from "./handlers/messageHandler";

let latestQr: string | null = null;

const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH &&
  existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)
    ? process.env.PUPPETEER_EXECUTABLE_PATH
    : undefined;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--single-process",
    ],
  },
});

client.on("qr", (qr: string) => {
  latestQr = qr;
  console.log("Scan this QR code to log in:");
  qrcode.generate(qr, { small: true });
  console.log("If the QR is unreadable in logs, open /qr on your service URL.");
});

client.on("ready", () => {
  latestQr = null;
  console.log("WhatsApp bot is ready!");
  if (executablePath) {
    console.log(`Using system browser: ${executablePath}`);
  }
  startStickerScanner(client);
});

client.on("authenticated", () => {
  latestQr = null;
  console.log("Authenticated successfully.");
});

client.on("auth_failure", (msg: string) => {
  console.error("Authentication failed:", msg);
});

client.on("message_create", async (message: Message) => {
  await handleMessage(client, message);
});

export function initWhatsApp(): void {
  client.initialize();
}

export function getLatestQr(): string | null {
  return latestQr;
}

export { client };
