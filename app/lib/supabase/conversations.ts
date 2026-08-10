/**
 * conversations / messages 表操作 — 轻量聊天
 */
import { supabaseSelect, supabaseWrite } from "./client";

/* ----- Types ----- */

export type Conversation = {
  id: string;
  requirementId: string;
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  sender: "buyer" | "supplier" | "system";
  content: string;
  createdAt: string;
};

/* ----- CRUD ----- */

export async function getOrCreateConversation(
  requirementId: string
): Promise<Conversation> {
  // 查已有
  const existing = await supabaseSelect<Record<string, unknown>>(
    `conversations?select=*&requirement_id=eq.${encodeURIComponent(requirementId)}&limit=1`
  );
  if (existing.length > 0) return mapConversation(existing[0]);

  // 创建
  const rows = await supabaseWrite<Record<string, unknown>[]>("conversations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ requirement_id: requirementId }),
  });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("创建聊天房间失败。");
  }
  return mapConversation(rows[0]);
}

export async function getMessages(
  conversationId: string
): Promise<Message[]> {
  const rows = await supabaseSelect<Record<string, unknown>>(
    `messages?select=*&conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.asc&limit=200`
  );
  return rows.map(mapMessage);
}

export async function insertMessage(
  conversationId: string,
  sender: "buyer" | "supplier" | "system",
  content: string
): Promise<Message> {
  const body = {
    conversation_id: conversationId,
    sender,
    content,
  };
  const rows = await supabaseWrite<Record<string, unknown>[]>("messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("发送消息失败。");
  }
  return mapMessage(rows[0]);
}

/* ----- Helpers ----- */

function mapConversation(row: Record<string, unknown>): Conversation {
  return {
    id: String(row.id ?? ""),
    requirementId: String(row.requirement_id ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id ?? ""),
    conversationId: String(row.conversation_id ?? ""),
    sender: (row.sender as Message["sender"]) ?? "system",
    content: String(row.content ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}
