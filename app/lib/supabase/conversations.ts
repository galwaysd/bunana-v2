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

export type ConversationAccess = Conversation & {
  buyerTokenHash: string | null;
  supplierTokenHash: string | null;
};

export type Message = {
  id: string;
  conversationId: string;
  sender: "buyer" | "supplier" | "system";
  content: string;
  createdAt: string;
};

/* ----- CRUD ----- */

export async function createConversation(
  requirementId: string,
  role: "buyer" | "supplier",
  tokenHash: string
): Promise<ConversationAccess> {
  const rows = await supabaseWrite<Record<string, unknown>[]>("conversations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      requirement_id: requirementId,
      [`${role}_token_hash`]: tokenHash,
    }),
  });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("创建聊天房间失败。");
  }
  return mapConversationAccess(rows[0]);
}

export async function getConversationAccess(
  conversationId: string
): Promise<ConversationAccess | null> {
  const rows = await supabaseSelect<Record<string, unknown>>(
    `conversations?select=*&id=eq.${encodeURIComponent(conversationId)}&limit=1`
  );
  return rows[0] ? mapConversationAccess(rows[0]) : null;
}

export async function claimConversationRole(
  conversationId: string,
  role: "buyer" | "supplier",
  tokenHash: string
): Promise<ConversationAccess | null> {
  const rows = await supabaseWrite<Record<string, unknown>[]>(
    `conversations?id=eq.${encodeURIComponent(conversationId)}&${role}_token_hash=is.null`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ [`${role}_token_hash`]: tokenHash }),
    }
  );
  return Array.isArray(rows) && rows[0] ? mapConversationAccess(rows[0]) : null;
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

function mapConversationAccess(row: Record<string, unknown>): ConversationAccess {
  return {
    ...mapConversation(row),
    buyerTokenHash: row.buyer_token_hash ? String(row.buyer_token_hash) : null,
    supplierTokenHash: row.supplier_token_hash ? String(row.supplier_token_hash) : null,
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
