import { WASocket, WAMessage } from "@whiskeysockets/baileys";

const TARGET_GROUP = process.env.GROUP_NAME?.trim();
const SPAM_WINDOW_MS = 8_000;

const stickerLog = new Map<string, Map<string, number[]>>();

function recordSticker(groupId: string, userId: string): number {
  if (!stickerLog.has(groupId)) stickerLog.set(groupId, new Map());
  const groupMap = stickerLog.get(groupId)!;
  const now = Date.now();
  const timestamps = groupMap.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < SPAM_WINDOW_MS);
  recent.push(now);
  groupMap.set(userId, recent);
  return recent.length;
}

function clearStickerLog(groupId: string, userId: string): void {
  stickerLog.get(groupId)?.delete(userId);
}

export async function handleMessage(
  sock: WASocket,
  msg: WAMessage,
): Promise<void> {
  try {
    if (!msg.message?.stickerMessage) return;
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid?.endsWith("@g.us")) return;

    const participant = msg.key.participant || remoteJid;

    if (TARGET_GROUP) {
      const metadata = await sock.groupMetadata(remoteJid);
      if (metadata.subject !== TARGET_GROUP) return;
    }

    await sock.sendMessage(remoteJid, { delete: msg.key });

    const count = recordSticker(remoteJid, participant);
    console.log(
      `Deleted sticker from ${participant} (${count} in window)`,
    );

    if (count > 3 && !msg.key.fromMe) {
      clearStickerLog(remoteJid, participant);
      await sock.groupParticipantsUpdate(remoteJid, [participant], "remove");
      console.log(`Removed ${participant} for sticker spam`);
    } else if (count >= 3) {
      await sock.sendMessage(
        remoteJid,
        {
          text: `⚠️ @${participant.split("@")[0]} stop sending stickers or you will be removed.`,
          mentions: [participant],
        },
      );
      console.log(`Warned ${participant} for sticker spam`);
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
}
