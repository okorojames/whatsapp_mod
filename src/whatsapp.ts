import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import { handleMessage } from "./handlers/messageHandler";

let sock: WASocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
export let latestQR: string | null = null;

export function getSocket(): WASocket | null {
  return sock;
}

export async function startBot(): Promise<void> {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "warn" }),
    browser: ["Chrome", "macOS", "22.04.4"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      await handleMessage(sock!, msg);
    }
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      latestQR = qr;
      console.log("Scan this QR code with WhatsApp (/qr endpoint)");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "close") {
      const err = lastDisconnect?.error as any;
      const statusCode = err?.output?.statusCode;
      const errorMsg = err?.message;
      const attrs = err?.data;
      console.log("Connection closed:", { statusCode, error: errorMsg, attrs });
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("Reconnecting in 3s...");
        reconnectTimeout = setTimeout(() => startBot(), 3000);
      } else {
        console.error("Logged out, manual re-auth required");
      }
    } else if (connection === "open") {
      console.log("WhatsApp bot is ready!");
    } else if (connection) {
      console.log("Connection state:", connection);
    }
  });
}
