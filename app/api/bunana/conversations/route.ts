/**
 * POST /api/bunana/conversations — 初始化/获取聊天
 * PUT  /api/bunana/conversations — 发送消息
 *
 * 安全加固: 需要 x-bunana-api-secret 请求头认证。
 * 客户端不得伪造 sender=system。
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateConversation,
  getMessages,
  insertMessage,
} from "@/app/lib/supabase/conversations";
import { getRequirementById } from "@/app/lib/supabase/requirements";
import { validateApiSecret, secureCorsHeaders } from "@/app/lib/auth";

/* ---- 生成角色首次系统消息 ---- */
function buildSystemMessage(
  role: "buyer" | "supplier",
  requirement: { fabricName: string; specs: string; summary: string; keywords: string[] }
): string {
  if (role === "buyer") {
    const usePart =
      requirement.keywords.length > 1
        ? requirement.keywords.slice(1, 3).join("、")
        : "通用面料";
    return (
      `我正在寻找这个面料：\n\n${requirement.fabricName || "未命名面料"}\n\n` +
      `用途：${usePart}\n` +
      `规格：${requirement.specs || "待确认"}\n\n` +
      `希望寻找供应商。`
    );
  }
  // supplier
  const specs = requirement.specs || "规格接近";
  return (
    `我有类似这个面料：\n\n${requirement.fabricName || "未命名面料"}\n\n` +
    `规格接近：\n${specs}\n\n` +
    `可以进一步沟通。`
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  // === 安全层: API 密钥认证 ===
  if (!validateApiSecret(request)) {
    return NextResponse.json(
      { success: false, error: "未授权的请求。" },
      { status: 401, headers: secureCorsHeaders(origin) }
    );
  }

  try {
    const body = await request.json();
    const requirementId: string = (body.requirementId ?? "").trim();
    const role: string = (body.role ?? "").trim();

    if (!requirementId || !role) {
      return NextResponse.json(
        { success: false, error: "缺少 requirementId 或 role。" },
        { status: 400, headers: secureCorsHeaders(origin) }
      );
    }
    if (role !== "buyer" && role !== "supplier") {
      return NextResponse.json(
        { success: false, error: "role 必须是 buyer 或 supplier。" },
        { status: 400, headers: secureCorsHeaders(origin) }
      );
    }

    // 确保 requirement 存在
    const requirement = await getRequirementById(requirementId);
    if (!requirement) {
      return NextResponse.json(
        { success: false, error: "该需求记录不存在。" },
        { status: 404, headers: secureCorsHeaders(origin) }
      );
    }

    // 获取或创建 conversation
    const conversation = await getOrCreateConversation(requirementId);
    let messages = await getMessages(conversation.id);

    // 如果该 role 还没有系统消息，自动创建
    const hasSystemMsg = messages.some(
      (m) => m.sender === "system" && m.content.includes(role === "buyer" ? "我正在寻找" : "我有类似")
    );
    if (!hasSystemMsg) {
      const sysContent = buildSystemMessage(role, requirement);
      await insertMessage(conversation.id, "system", sysContent);
      messages = await getMessages(conversation.id);
    }

    return NextResponse.json(
      { success: true, conversation, messages },
      { headers: secureCorsHeaders(origin) }
    );
  } catch (error) {
    console.error("POST /api/bunana/conversations error:", error);
    return NextResponse.json(
      { success: false, error: "初始化聊天失败。" },
      { status: 500, headers: secureCorsHeaders(origin) }
    );
  }
}

/* ---- PUT: 发送消息 ---- */
export async function PUT(request: NextRequest) {
  const origin = request.headers.get("origin");

  // === 安全层: API 密钥认证 ===
  if (!validateApiSecret(request)) {
    return NextResponse.json(
      { success: false, error: "未授权的请求。" },
      { status: 401, headers: secureCorsHeaders(origin) }
    );
  }

  try {
    const body = await request.json();
    const conversationId: string = (body.conversationId ?? "").trim();
    const sender: string = (body.sender ?? "").trim();
    const content: string = (body.content ?? "").trim();

    if (!conversationId || !sender || !content) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数。" },
        { status: 400, headers: secureCorsHeaders(origin) }
      );
    }

    if (!["buyer", "supplier"].includes(sender)) {
      return NextResponse.json(
        { success: false, error: "sender 无效，仅支持 buyer 或 supplier。" },
        { status: 400, headers: secureCorsHeaders(origin) }
      );
    }

    // 消息长度限制
    if (content.length > 5000) {
      return NextResponse.json(
        { success: false, error: "消息内容过长，请控制在 5000 字以内。" },
        { status: 400, headers: secureCorsHeaders(origin) }
      );
    }

    const message = await insertMessage(
      conversationId,
      sender as "buyer" | "supplier",
      content
    );

    // 返回完整消息列表
    const messages = await getMessages(conversationId);

    return NextResponse.json(
      { success: true, message, messages },
      { headers: secureCorsHeaders(origin) }
    );
  } catch (error) {
    console.error("PUT /api/bunana/conversations error:", error);
    return NextResponse.json(
      { success: false, error: "发送消息失败。" },
      { status: 500, headers: secureCorsHeaders(origin) }
    );
  }
}
