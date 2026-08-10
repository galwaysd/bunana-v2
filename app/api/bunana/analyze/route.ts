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
import { NextResponse } from "next/server";
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

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as BunanaAnalyzeRequest;

    if (body.mode === "initial") {
      return handleInitial(body);
    }

    if (body.mode === "refine") {
      return handleRefine(body);
    }

    return json(400, { success: false, error: "mode 必须是 initial 或 refine。" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 暂时无法处理该请求。";
    return json(500, { success: false, error: message });
  }
}

// ===== initial 模式 =====

async function handleInitial(body: BunanaAnalyzeRequest): Promise<NextResponse> {
  const text = (body.text ?? "").trim();
  const images = body.images ?? [];

  if (!text && images.length === 0) {
    return json(400, { success: false, error: "请提供文字需求或图片。" });
  }

  if (text.length > 1200) {
    return json(400, { success: false, error: "需求内容太长，请控制在 1200 字以内。" });
  }

  if (images.length > 3) {
    return json(400, { success: false, error: "单次最多上传 3 张图片。" });
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
    return json(503, { success: false, error: message });
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
  });
}

// ===== refine 模式 =====

async function handleRefine(body: BunanaAnalyzeRequest): Promise<NextResponse> {
  const currentDNA = body.currentDNA;
  const question = body.question;
  const answer = (body.answer ?? "").trim();
  const answeredLog = body.answeredLog ?? {};

  if (!currentDNA) {
    return json(400, { success: false, error: "缺少 currentDNA。" });
  }
  if (!question) {
    return json(400, { success: false, error: "缺少 question。" });
  }
  if (!answer) {
    return json(400, { success: false, error: "缺少 answer。" });
  }

  let updatedDNA: FabricDNA;
  let followUpQuestions: FollowUpQuestion[];
  let evidence: DemandEvidence;
  let aiProvider: "zhipu" | "dify" = "zhipu";

  if (!hasZhipuApiKey()) {
    return json(503, {
      success: false,
      error: "当前追问补全需要 ZHIPU_API_KEY，请先配置环境变量。"
    });
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
    return json(502, { success: false, error: message });
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
  });
}

// ===== 工具 =====

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": process.env.BUNANA_ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

function json(status: number, body: AnalyzeResponse): NextResponse {
  return NextResponse.json(body, { status, headers: corsHeaders() });
}
