import { Client, GroupChat, Message } from "whatsapp-web.js";

const TARGET_GROUP = process.env.GROUP_NAME?.trim();

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
    if (message.fromMe) return;
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

    if (count > 3) {
      clearStickerLog(chat.id._serialized, senderId);
      const groupChat = chat as GroupChat;
      await groupChat.removeParticipants([senderId]);
      console.log(`Removed ${senderId} from "${chat.name}" for sticker spam`);
    } else if (count === 3) {
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
