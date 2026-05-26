import { db } from "./db.js";
import { KANBAN_STAGES } from "./workflowRules.js";

export const CHAT_CHANNELS = [
  { id: "geral", label: "Geral", description: "Todos os setores" },
  ...KANBAN_STAGES.map((s) => ({
    id: s.toLowerCase(),
    label: s,
    description: `Setor ${s}`,
    sector: s
  }))
];

const CHANNEL_IDS = new Set(CHAT_CHANNELS.map((c) => c.id));

export function isValidChannel(channel) {
  return CHANNEL_IDS.has(channel);
}

function getLastReadId(userId, channel) {
  const row = db
    .prepare(
      "SELECT last_message_id FROM chat_read_cursors WHERE user_id = ? AND channel = ?"
    )
    .get(userId, channel);
  return row?.last_message_id ?? 0;
}

function setLastReadId(userId, channel, messageId) {
  const current = getLastReadId(userId, channel);
  const next = Math.max(current, messageId);
  db.prepare(
    `INSERT INTO chat_read_cursors (user_id, channel, last_message_id)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, channel) DO UPDATE SET last_message_id = excluded.last_message_id`
  ).run(userId, channel, next);
}

export function listChannelsForUser(user) {
  return CHAT_CHANNELS.map((ch) => {
    const unread = countUnreadInChannel(user.id, ch.id);
    return { ...ch, unread };
  });
}

function countUnreadInChannel(userId, channel) {
  const lastRead = getLastReadId(userId, channel);
  return db
    .prepare(
      `SELECT COUNT(*) AS c FROM chat_messages
       WHERE channel = ? AND id > ? AND user_id != ?`
    )
    .get(channel, lastRead, userId).c;
}

export function getChannelMessages(channel, { after = 0, limit = 80 } = {}) {
  if (!isValidChannel(channel)) return [];
  const max = Math.min(Math.max(Number(limit) || 80, 1), 200);
  return db
    .prepare(
      `SELECT id, channel, user_id AS userId, user_name AS userName,
              user_sector AS userSector, body, created_at AS createdAt
       FROM chat_messages
       WHERE channel = ? AND id > ?
       ORDER BY id ASC
       LIMIT ?`
    )
    .all(channel, Number(after) || 0, max);
}

export function postMessage(user, channel, body) {
  if (!isValidChannel(channel)) {
    return { ok: false, error: "Canal inválido" };
  }
  const text = String(body || "").trim();
  if (!text) return { ok: false, error: "Mensagem vazia" };
  if (text.length > 2000) return { ok: false, error: "Mensagem muito longa (máx. 2000)" };

  const result = db
    .prepare(
      `INSERT INTO chat_messages (channel, user_id, user_name, user_sector, body)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      channel,
      user.id,
      user.name,
      user.role === "admin" ? null : user.sector,
      text
    );

  const message = db
    .prepare(
      `SELECT id, channel, user_id AS userId, user_name AS userName,
              user_sector AS userSector, body, created_at AS createdAt
       FROM chat_messages WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  return { ok: true, message };
}

export function markChannelRead(userId, channel, throughMessageId) {
  if (!isValidChannel(channel)) return { ok: false, error: "Canal inválido" };
  const maxId = db
    .prepare("SELECT MAX(id) AS m FROM chat_messages WHERE channel = ? AND id <= ?")
    .get(channel, throughMessageId)?.m;
  if (maxId) setLastReadId(userId, channel, maxId);
  return { ok: true };
}

export function markAllChatRead(userId) {
  for (const ch of CHAT_CHANNELS) {
    const max = db
      .prepare("SELECT MAX(id) AS m FROM chat_messages WHERE channel = ?")
      .get(ch.id)?.m;
    if (max) setLastReadId(userId, ch.id, max);
  }
  return { ok: true };
}

export function isChatMessageReadForUser(userId, messageId, channel) {
  return messageId <= getLastReadId(userId, channel);
}

export function markChatNotificationRead(userId, messageId) {
  const row = db
    .prepare("SELECT channel FROM chat_messages WHERE id = ?")
    .get(messageId);
  if (!row) return;
  setLastReadId(userId, row.channel, messageId);
}

/** Notificações de chat para o sino (mensagens de outros usuários não lidas) */
export function buildChatNotifications(user, limit = 20) {
  const items = [];

  for (const ch of CHAT_CHANNELS) {
    const lastRead = getLastReadId(user.id, ch.id);
    const rows = db
      .prepare(
        `SELECT id, channel, user_name AS userName, user_sector AS userSector, body, created_at AS createdAt
         FROM chat_messages
         WHERE channel = ? AND id > ? AND user_id != ?
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(ch.id, lastRead, user.id, limit);

    for (const row of rows) {
      const preview =
        row.body.length > 60 ? `${row.body.slice(0, 60)}…` : row.body;
      const chLabel = CHAT_CHANNELS.find((c) => c.id === row.channel)?.label || row.channel;
      items.push({
        id: `chat:${row.id}`,
        type: "chat",
        priority: "medium",
        channel: row.channel,
        channelLabel: chLabel,
        messageId: row.id,
        projectId: null,
        projectName: null,
        sector: row.userSector,
        message: `${row.userName}: ${preview}`,
        meta: chLabel,
        at: row.createdAt,
        href: { menu: "Chat", channel: row.channel }
      });
    }
  }

  items.sort((a, b) => new Date(b.at) - new Date(a.at));
  return items.slice(0, limit);
}
