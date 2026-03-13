import { Chat, Client, GroupChat, Message } from "whatsapp-web.js";

const TARGET_GROUP = process.env.GROUP_NAME?.trim();
const SCAN_INTERVAL_MS = 10_000; // 10 seconds
const SCAN_LOOKBACK_MS = 60_000; // 1 minute

// Track sticker timestamps per user per group: Map<groupId, Map<userId, timestamps[]>>
const stickerLog = new Map<string, Map<string, number[]>>();

// Time window (ms) to consider stickers as sent "at once"
const SPAM_WINDOW_MS = 8_000; // 8 seconds

function recordSticker(groupId: string, userId: string): number {
  if (!stickerLog.has(groupId)) stickerLog.set(groupId, new Map());
  const groupMap = stickerLog.get(groupId)!;

  const now = Date.now();
  const timestamps = groupMap.get(userId) ?? [];

  // Keep only timestamps within the spam window
  const recent = timestamps.filter((t) => now - t < SPAM_WINDOW_MS);
  recent.push(now);
  groupMap.set(userId, recent);

  return recent.length;
}

function clearStickerLog(groupId: string, userId: string): void {
  stickerLog.get(groupId)?.delete(userId);
}

export async function handleMessage(
  client: Client,
  message: Message,
): Promise<void> {
  try {
    // Quick checks before any async work — no need to fetch chat
    if (message.type !== "sticker") return;

    // Group messages come from @g.us addresses
    const isGroup = message.from.endsWith("@g.us");
    if (!isGroup) return;

    // Delete the sticker immediately — don't wait for chat details
    await message.delete(true);

    // Now fetch chat for group name check, counting, and warnings
    const chat = await message.getChat();
    if (TARGET_GROUP && chat.name !== TARGET_GROUP) return;

    const senderId = message.author ?? message.from;
    const count = recordSticker(chat.id._serialized, senderId);
    console.log(
      `Deleted sticker from ${senderId} in "${chat.name}" (${count} in window)`,
    );

    if (count > 3 && !message.fromMe) {
      clearStickerLog(chat.id._serialized, senderId);
      const groupChat = chat as GroupChat;
      await groupChat.removeParticipants([senderId]);
      console.log(`Removed ${senderId} from "${chat.name}" for sticker spam`);
    } else if (count >= 3) {
      await chat.sendMessage(
        `⚠️ @${senderId.split("@")[0]} stop sending stickers or you will be removed.`,
        { mentions: [senderId] },
      );
      console.log(`Warned ${senderId} in "${chat.name}" for sticker spam`);
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
}

// Track message IDs already deleted by the scanner to avoid double-processing
const deletedByScanner = new Set<string>();

async function scanGroupForStickers(chat: Chat): Promise<void> {
  try {
    const messages = await chat.fetchMessages({ limit: 50 });
    const cutoff = Date.now() - SCAN_LOOKBACK_MS;

    for (const msg of messages) {
      if (msg.type !== "sticker") continue;
      if (msg.timestamp * 1000 < cutoff) continue;
      if (deletedByScanner.has(msg.id._serialized)) continue;

      deletedByScanner.add(msg.id._serialized);
      await msg.delete(true);
      console.log(
        `[Scanner] Deleted sticker from ${msg.author ?? msg.from} in "${chat.name}"`,
      );
    }

    // Prune old IDs to prevent memory leak
    if (deletedByScanner.size > 500) deletedByScanner.clear();
  } catch (error) {
    console.error(`[Scanner] Error scanning "${chat.name}":`, error);
  }
}

export function startStickerScanner(client: Client): void {
  setInterval(async () => {
    try {
      const chats = await client.getChats();
      for (const chat of chats) {
        if (!chat.isGroup) continue;
        if (TARGET_GROUP && chat.name !== TARGET_GROUP) continue;
        await scanGroupForStickers(chat);
      }
    } catch (error) {
      console.error("[Scanner] Error:", error);
    }
  }, SCAN_INTERVAL_MS);
  console.log(
    `Sticker scanner started (every ${SCAN_INTERVAL_MS / 1000}s, lookback ${SCAN_LOOKBACK_MS / 1000}s)`,
  );
}
