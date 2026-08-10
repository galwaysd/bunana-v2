/**
 * POST /api/bunana/analyze
 *
 * 支持两种模式：
 * - initial: 首次分析（文字 + 图片 → FabricDNA + 追问）
 * - refine:  追问回答后更新 DNA
 *
 * Provider 链：zhipu → dify
 * refine 模式跳过 Dify。
 */
import { NextRequest, NextResponse } from "next/server";
import type {
  BunanaAnalyzeRequest,
  AnalyzeResponse,
  DemandResult,
  FabricDNA,
  FollowUpQuestion,
  DemandEvidence
} from "@/app/types";
import { runZhipuInitial, runZhipuRefine, hasZhipuApiKey, zhipuModel } from "@/app/lib/ai/providers/zhipu";
import { runDifyInitial, hasDifyApiKey } from "@/app/lib/ai/providers/dify";
import { buildStructuredFollowUpQuestions, filterAnsweredQuestions } from "@/app/lib/ai/normalize";
import {
  DNA_FIELD_KEYS,
  mergeDnaAnswer,
  normalizeDnaStatuses
} from "@/app/lib/dna";
import { validateApiSecret, unauthorizedResponse, secureCorsHeaders } from "@/app/lib/auth";
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/app/lib/rate-limit";

export const runtime = "nodejs";

const zhipuModelFallbackCodes = new Set([
  "1211",
  "1212",
  "1220",
  "1221",
  "1305",
  "1308",
  "1311"
]);

// ===== POST handler =====

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, { status: 204, headers: secureCorsHeaders(origin) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // === 安全层: API 密钥认证 ===
  if (!validateApiSecret(request)) {
    return NextResponse.json(
      { success: false, error: "未授权的请求。" },
      { status: 401, headers: secureCorsHeaders(request.headers.get("origin")) }
    );
  }

  // === 安全层: 速率限制 (每分钟 5 次) ===
  const ip = getClientIP(request);
  const rate = checkRateLimit(`analyze:${ip}`, 5, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil((rate.resetAt - Date.now()) / 1000)} 秒后重试。`, retryAfter: Math.ceil((rate.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { ...secureCorsHeaders(request.headers.get("origin")), "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = (await request.json()) as BunanaAnalyzeRequest;

    if (body.mode === "initial") {
      return handleInitial(body, request);
    }

    if (body.mode === "refine") {
      return handleRefine(body, request);
    }

    return json(400, { success: false, error: "mode 必须是 initial 或 refine。" }, request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 暂时无法处理该请求。";
    return json(500, { success: false, error: message }, request);
  }
}

// ===== initial 模式 =====

async function handleInitial(body: BunanaAnalyzeRequest, request: NextRequest): Promise<NextResponse> {
  const text = (body.text ?? "").trim();
  const images = body.images ?? [];

  if (!text && images.length === 0) {
    return json(400, { success: false, error: "请提供文字需求或图片。" }, request);
  }

  if (text.length > 1200) {
    return json(400, { success: false, error: "需求内容太长，请控制在 1200 字以内。" }, request);
  }

  if (images.length > 3) {
    return json(400, { success: false, error: "单次最多上传 3 张图片。" }, request);
  }

  // 图片大小校验：单张 base64 不超过 10MB
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (img.dataUrl && img.dataUrl.length > 14_000_000) {
      return json(400, { success: false, error: `第 ${i + 1} 张图片过大，请压缩后重试。` }, request);
    }
  }

  const language = "zh";
  const demandText = text || "仅上传图片";

  // Provider chain: zhipu → dify
  let result: DemandResult | null = null;
  let aiProvider: "zhipu" | "dify" = "dify";
  let lastError: Error | null = null;

  // 1. Zhipu
  if (hasZhipuApiKey()) {
    const primaryModel = zhipuModel();
    const fallbackModel = "glm-4v-flash";
    const modelsToTry =
      primaryModel === fallbackModel ? [primaryModel] : [primaryModel, fallbackModel];

    for (const model of modelsToTry) {
      try {
        result = await runZhipuInitial(demandText, images, language, model);
        aiProvider = "zhipu";
        break;
      } catch (error: unknown) {
        const zhipuCode = String(
          (error as Record<string, unknown>)?.zhipuCode || ""
        );
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Zhipu ${model} failed (code=${zhipuCode || "none"}):`, error);

        if (!zhipuModelFallbackCodes.has(zhipuCode)) break;
      }
    }
  }

  // 2. Dify
  if (!result && hasDifyApiKey()) {
    try {
      result = await runDifyInitial(
        demandText,
        images,
        language,
        "bunana-anonymous-user"
      );
      aiProvider = "dify";
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn("Dify workflow failed:", error);
    }
  }

  if (!result) {
    const message = lastError?.message || "未配置可用的 AI provider，请配置 ZHIPU_API_KEY 或 DIFY_API_KEY。";
    return json(503, { success: false, error: message }, request);
  }

  result.dna = normalizeDnaStatuses(result.dna, false, undefined, /* keepInferences */ true);
  // 新流程不再生成追问 — 用户直接在卡片上检查编辑
  result.followUpQuestions = [];

  return json(200, {
    success: true,
    aiProvider,
    dna: result.dna,
    demandCard: result.demandCard,
    followUpQuestions: result.followUpQuestions,
    missingFields: result.missingFields,
    keywords: result.keywords,
    summary: result.summary,
    confidence: result.confidence,
    evidence: result.evidence
  }, request);
}

// ===== refine 模式 =====

async function handleRefine(body: BunanaAnalyzeRequest, request: NextRequest): Promise<NextResponse> {
  const currentDNA = body.currentDNA;
  const question = body.question;
  const answer = (body.answer ?? "").trim();
  const answeredLog = body.answeredLog ?? {};

  if (!currentDNA) {
    return json(400, { success: false, error: "缺少 currentDNA。" }, request);
  }
  if (!question) {
    return json(400, { success: false, error: "缺少 question。" }, request);
  }
  if (!answer) {
    return json(400, { success: false, error: "缺少 answer。" }, request);
  }

  let updatedDNA: FabricDNA;
  let followUpQuestions: FollowUpQuestion[];
  let evidence: DemandEvidence;
  let aiProvider: "zhipu" | "dify" = "zhipu";

  if (!hasZhipuApiKey()) {
    return json(503, {
      success: false,
      error: "当前追问补全需要 ZHIPU_API_KEY，请先配置环境变量。"
    }, request);
  }

  const primaryModel = zhipuModel();
  const fallbackModel = "glm-4v-flash";
  const modelsToTry =
    primaryModel === fallbackModel ? [primaryModel] : [primaryModel, fallbackModel];
  let zhipuResult: Awaited<ReturnType<typeof runZhipuRefine>> | null = null;
  let lastRefineError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      zhipuResult = await runZhipuRefine(
        currentDNA,
        question,
        answer,
        answeredLog,
        model
      );
      break;
    } catch (error: unknown) {
      const zhipuCode = String(
        (error as Record<string, unknown>)?.zhipuCode || ""
      );
      lastRefineError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Zhipu refine ${model} failed (code=${zhipuCode || "none"}):`, error);
      if (!zhipuModelFallbackCodes.has(zhipuCode)) break;
    }
  }

  if (!zhipuResult) {
    const message = lastRefineError?.message || "Zhipu refine failed.";
    return json(502, { success: false, error: message }, request);
  }

  const result = zhipuResult;
  updatedDNA = result.dna;
  followUpQuestions = result.followUpQuestions;
  evidence = {
    observed: [],
    inferred: [],
    confirmed: [`${question.field}: ${answer}`],
    unknown: [],
    followUpQuestions: followUpQuestions.map((q) => q.question)
  };
  aiProvider = "zhipu";

  // 更新 answeredLog
  const newAnsweredLog: Record<string, string> = {
    ...answeredLog,
    [question.field]: answer,
    [question.id]: answer
  };

  // API 层保证当前用户回答立即写回，且只有用户输入能成为 confirmed。
  const answeredFields = new Set<keyof FabricDNA>(
    DNA_FIELD_KEYS.filter((field) => Boolean(newAnsweredLog[field]))
  );

  updatedDNA = normalizeDnaStatuses(updatedDNA, true, answeredFields);
  for (const field of answeredFields) {
    updatedDNA = mergeDnaAnswer(updatedDNA, field, newAnsweredLog[field]);
  }

  // 始终根据写回后的真实 DNA 重新生成追问，并过滤已回答字段。
  followUpQuestions = filterAnsweredQuestions(
    buildStructuredFollowUpQuestions(updatedDNA),
    newAnsweredLog
  ).slice(0, 4);

  return json(200, {
    success: true,
    aiProvider,
    dna: updatedDNA,
    followUpQuestions,
    evidence
  }, request);
}

// ===== 工具 =====

function json(status: number, body: AnalyzeResponse, request: NextRequest): NextResponse {
  return NextResponse.json(body, { status, headers: secureCorsHeaders(request.headers.get("origin")) });
}
