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
import { parseSpecsValues } from "@/app/lib/dna";
import { validateApiSecret, secureCorsHeaders } from "@/app/lib/auth";

/* ---- 生成角色首次系统消息（多语言） ---- */
function buildSystemMessage(
  role: "buyer" | "supplier",
  requirement: { fabricName: string; specs: string; summary: string; keywords: string[] },
  locale: string
): string {
  const lo = ["zh", "en", "ja", "ko"].includes(locale) ? locale : "zh";
  const templates: Record<string, {
    buyer: (name: string, use: string, specs: string) => string;
    supplier: (name: string, specs: string) => string;
  }> = {
    zh: {
      buyer: (n, u, s) => `我正在寻找这个面料：\n\n${n}\n\n用途：${u}\n规格：${s}\n\n希望寻找供应商。`,
      supplier: (n, s) => `我有类似这个面料：\n\n${n}\n\n规格接近：\n${s}\n\n可以进一步沟通。`,
    },
    en: {
      buyer: (n, u, s) => `I'm looking for this fabric:\n\n${n}\n\nApplication: ${u}\nSpecs: ${s}\n\nLooking for suppliers.`,
      supplier: (n, s) => `I have a similar fabric:\n\n${n}\n\nSimilar specs:\n${s}\n\nLet's discuss further.`,
    },
    ja: {
      buyer: (n, u, s) => `この生地を探しています：\n\n${n}\n\n用途：${u}\n仕様：${s}\n\n供給者を探しています。`,
      supplier: (n, s) => `この生地と似たものがあります：\n\n${n}\n\n類似仕様：\n${s}\n\n further相談しましょう。`,
    },
    ko: {
      buyer: (n, u, s) => `이 원단을 찾고 있습니다：\n\n${n}\n\n용도：${u}\n사양：${s}\n\n공급자를 찾고 있습니다.`,
      supplier: (n, s) => `이 원단과 유사한 것이 있습니다：\n\n${n}\n\n유사 사양：\n${s}\n\n추가 상담해요.`,
    },
  };

  const tpl = templates[lo];
  const fabricName = requirement.fabricName || (lo === "zh" ? "未命名面料" : lo === "en" ? "Unnamed Fabric" : lo === "ja" ? "名前なし生地" : "이름 없는 원단");
  const usePart = requirement.keywords.length > 1
    ? requirement.keywords.slice(1, 3).join("、")
    : (lo === "zh" ? "通用面料" : lo === "en" ? "General fabric" : lo === "ja" ? "一般生地" : "일반 원단");
  const specsRaw = requirement.specs || (lo === "zh" ? "待确认" : lo === "en" ? "TBD" : lo === "ja" ? "未定" : "미정");
  const specs = parseSpecsValues(specsRaw).join("、") || specsRaw;

  return role === "buyer"
    ? tpl.buyer(fabricName, usePart, specs)
    : tpl.supplier(fabricName, specs);
}

/* ---- 跨语言检测系统消息是否已存在 ---- */
const BUYER_MARKERS = ["我正在寻找", "I'm looking for", "この生地を探しています", "이 원단을 찾고 있습니다"];
const SUPPLIER_MARKERS = ["我有类似", "I have a similar", "この生地と似たものがあります", "이 원단과 유사한 것이 있습니다"];

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
    const locale: string = (body.locale ?? "zh").trim();

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

    // 如果该 role 还没有系统消息，自动创建（跨语言检测）
    const markers = role === "buyer" ? BUYER_MARKERS : SUPPLIER_MARKERS;
    const hasSystemMsg = messages.some(
      (m) => m.sender === "system" && markers.some((mk) => m.content.includes(mk))
    );
    if (!hasSystemMsg) {
      const sysContent = buildSystemMessage(role as "buyer" | "supplier", requirement, locale);
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
