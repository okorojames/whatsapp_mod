import puppeteer from "puppeteer";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { handleMessage, startStickerScanner } from "./handlers/messageHandler";

const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath,
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
  console.log("Scan this QR code to log in:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp bot is ready!");
  console.log(`Using browser: ${executablePath}`);
  startStickerScanner(client);
});

client.on("authenticated", () => {
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

export { client };
