import { NextRequest, NextResponse } from "next/server";
import {
  claimConversationRole,
  createConversation,
  getConversationAccess,
  getMessages,
  insertMessage,
  type ConversationAccess,
} from "@/app/lib/supabase/conversations";
import { getRequirementById } from "@/app/lib/supabase/requirements";
import {
  createParticipantToken,
  hashParticipantToken,
  tokenHashMatches,
} from "@/app/lib/chat-auth";
import { checkRateLimit, getClientIP } from "@/app/lib/rate-limit";
import { secureCorsHeaders } from "@/app/lib/auth";

type ParticipantRole = "buyer" | "supplier";

function json(request: NextRequest, status: number, body: object) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...secureCorsHeaders(request.headers.get("origin")),
      "Cache-Control": "no-store",
    },
  });
}

function validRole(value: unknown): value is ParticipantRole {
  return value === "buyer" || value === "supplier";
}

function publicConversation(conversation: ConversationAccess) {
  return {
    id: conversation.id,
    requirementId: conversation.requirementId,
    createdAt: conversation.createdAt,
  };
}

function authorize(conversation: ConversationAccess, token: string): ParticipantRole | null {
  if (!token) return null;
  const hash = hashParticipantToken(token);
  if (tokenHashMatches(hash, conversation.buyerTokenHash)) return "buyer";
  if (tokenHashMatches(hash, conversation.supplierTokenHash)) return "supplier";
  return null;
}

async function addWelcomeMessage(
  conversationId: string,
  role: ParticipantRole
) {
  const content = role === "buyer"
    ? "你正在寻找这款面料。可以直接和潜在供应方交换数量、规格、交期和联系方式。"
    : "你可以提供这款或类似面料。可以直接和需求方交换库存、规格、样品和联系方式。";
  await insertMessage(conversationId, "system", content);
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: secureCorsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "create") {
      const requirementId = String(body.requirementId ?? "").trim();
      const intent = body.intent;
      if (!requirementId || !validRole(intent)) {
        return json(request, 400, { success: false, error: "Invalid conversation" });
      }

      const limit = checkRateLimit(`chat-create:${getClientIP(request)}`, 10, 60_000);
      if (!limit.allowed) {
        return json(request, 429, { success: false, error: "Too many requests" });
      }

      const requirement = await getRequirementById(requirementId);
      if (!requirement) {
        return json(request, 404, { success: false, error: "Invalid conversation" });
      }

      const token = createParticipantToken();
      const conversation = await createConversation(
        requirementId,
        intent,
        hashParticipantToken(token)
      );
      await addWelcomeMessage(conversation.id, intent);
      const messages = await getMessages(conversation.id);
      return json(request, 201, {
        success: true,
        conversation: publicConversation(conversation),
        token,
        role: intent,
        messages,
      });
    }

    const conversationId = String(body.conversationId ?? "").trim();
    const requirementId = String(body.requirementId ?? "").trim();
    if (!conversationId) {
      return json(request, 400, { success: false, error: "Invalid conversation" });
    }

    const conversation = await getConversationAccess(conversationId);
    if (!conversation) {
      return json(request, 404, { success: false, error: "Invalid conversation" });
    }
    if (requirementId && conversation.requirementId !== requirementId) {
      return json(request, 403, { success: false, error: "Invalid conversation" });
    }

    if (action === "claim") {
      const intent = body.intent;
      if (!validRole(intent)) {
        return json(request, 400, { success: false, error: "Invalid conversation" });
      }
      const requestedHash = intent === "buyer"
        ? conversation.buyerTokenHash
        : conversation.supplierTokenHash;
      if (requestedHash) {
        return json(request, 403, { success: false, error: "Role already claimed" });
      }

      const token = createParticipantToken();
      const claimed = await claimConversationRole(
        conversationId,
        intent,
        hashParticipantToken(token)
      );
      if (!claimed) {
        return json(request, 409, { success: false, error: "Role already claimed" });
      }
      await addWelcomeMessage(claimed.id, intent);
      const messages = await getMessages(claimed.id);
      return json(request, 200, {
        success: true,
        conversation: publicConversation(claimed),
        token,
        role: intent,
        messages,
      });
    }

    if (action === "read") {
      const token = String(body.token ?? "");
      const role = authorize(conversation, token);
      if (!role) {
        return json(request, 401, { success: false, error: "Unauthorized" });
      }
      const messages = await getMessages(conversation.id);
      return json(request, 200, {
        success: true,
        conversation: publicConversation(conversation),
        role,
        messages,
      });
    }

    return json(request, 400, { success: false, error: "Invalid conversation" });
  } catch (error) {
    console.error("POST /api/bunana/conversations error:", error);
    return json(request, 500, { success: false, error: "Conversation unavailable" });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const conversationId = String(body.conversationId ?? "").trim();
    const token = String(body.token ?? "");
    const content = String(body.content ?? "").trim();

    if (!conversationId) {
      return json(request, 400, { success: false, error: "Invalid conversation" });
    }
    if (!content) {
      return json(request, 400, { success: false, error: "Message is empty" });
    }
    if (content.length > 5000) {
      return json(request, 400, { success: false, error: "Message too long" });
    }

    const conversation = await getConversationAccess(conversationId);
    if (!conversation) {
      return json(request, 404, { success: false, error: "Invalid conversation" });
    }
    const role = authorize(conversation, token);
    if (!role) {
      return json(request, 401, { success: false, error: "Unauthorized" });
    }

    const tokenHash = hashParticipantToken(token);
    const limit = checkRateLimit(`chat-send:${tokenHash}`, 5, 10_000);
    if (!limit.allowed) {
      return json(request, 429, { success: false, error: "Too many messages" });
    }

    const message = await insertMessage(conversation.id, role, content);
    const messages = await getMessages(conversation.id);
    return json(request, 200, { success: true, message, messages });
  } catch (error) {
    console.error("PUT /api/bunana/conversations error:", error);
    return json(request, 500, { success: false, error: "Message could not be sent" });
  }
}
