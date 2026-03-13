import { existsSync } from "node:fs";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { handleMessage, startStickerScanner } from "./handlers/messageHandler";

let latestQr: string | null = null;
let clientStatus:
  | "initializing"
  | "qr_waiting"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "auth_failure" = "initializing";

const scannerEnabled = process.env.ENABLE_STICKER_SCANNER === "true";

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
  clientStatus = "qr_waiting";
  console.log("Scan this QR code to log in:");
  qrcode.generate(qr, { small: true });
  console.log("If the QR is unreadable in logs, open /qr on your service URL.");
});

client.on("ready", () => {
  latestQr = null;
  clientStatus = "ready";
  console.log("WhatsApp bot is ready!");
  if (executablePath) {
    console.log(`Using system browser: ${executablePath}`);
  }
  if (scannerEnabled) {
    startStickerScanner(client);
  } else {
    console.log("Sticker scanner disabled; using real-time deletion only.");
  }
});

client.on("authenticated", () => {
  latestQr = null;
  clientStatus = "authenticated";
  console.log("Authenticated successfully.");
});

client.on("auth_failure", (msg: string) => {
  clientStatus = "auth_failure";
  console.error("Authentication failed:", msg);
});

client.on("disconnected", (reason: string) => {
  clientStatus = "disconnected";
  latestQr = null;
  console.error("WhatsApp disconnected:", reason);
});

client.on("change_state", (state: string) => {
  console.log("WhatsApp state changed:", state);
});

client.on("message_create", async (message: Message) => {
  await handleMessage(client, message);
});

export function initWhatsApp(): void {
  clientStatus = "initializing";
  client.initialize();
}

export function getLatestQr(): string | null {
  return latestQr;
}

export function getClientStatus(): typeof clientStatus {
  return clientStatus;
}

export { client };
