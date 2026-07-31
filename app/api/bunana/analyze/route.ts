/**
 * POST /api/bunana/analyze
 *
 * 支持两种模式：
 * - initial: 首次分析（文字 + 图片 → FabricDNA + 追问）
 * - refine:  追问回答后更新 DNA
 *
 * Provider 链：zhipu → dify → demo
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
import { runDemoInitial, runDemoRefine } from "@/app/lib/ai/demo";
import { buildStructuredFollowUpQuestions, filterAnsweredQuestions } from "@/app/lib/ai/normalize";
import { mergeDnaAnswer, normalizeDnaStatuses } from "@/app/lib/dna";

export const runtime = "nodejs";

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

  // Provider chain: zhipu → dify → demo
  let result: DemandResult | null = null;
  let aiProvider: "zhipu" | "dify" | "demo" = "demo";

  // 1. Zhipu
  if (hasZhipuApiKey()) {
    const primaryModel = zhipuModel();
    const fallbackModel = "GLM-4V-Flash";
    const modelsToTry =
      primaryModel === fallbackModel ? [primaryModel] : [primaryModel, fallbackModel];

    let lastZhipuCode = "";

    for (const model of modelsToTry) {
      try {
        result = await runZhipuInitial(demandText, images, language);
        aiProvider = "zhipu";
        break;
      } catch (error: unknown) {
        const zhipuCode = String(
          (error as Record<string, unknown>)?.zhipuCode || ""
        );
        lastZhipuCode = zhipuCode;
        console.warn(`Zhipu ${model} failed (code=${zhipuCode || "none"}):`, error);

        if (zhipuCode === "1302") break;        // account rate limit → stop
        if (zhipuCode !== "1305") break;         // non-busy error → stop
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
      console.warn("Dify workflow failed:", error);
    }
  }

  // 3. Demo
  if (!result) {
    result = runDemoInitial(demandText, images, language);
    aiProvider = "demo";
  }

  result.dna = normalizeDnaStatuses(result.dna, false);
  result.followUpQuestions = buildStructuredFollowUpQuestions(result.dna).slice(0, 4);

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
  let aiProvider: "zhipu" | "dify" | "demo" = "demo";

  // Refine chain: zhipu → demo (skip Dify)
  if (hasZhipuApiKey()) {
    try {
      const result = await runZhipuRefine(currentDNA, question, answer, answeredLog);
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
    } catch (error) {
      console.warn("Zhipu refine failed:", error);
      // fall through to demo
      const demoResult = runDemoRefine(currentDNA, question, answer, answeredLog);
      updatedDNA = demoResult.dna;
      followUpQuestions = demoResult.followUpQuestions;
      evidence = demoResult.evidence;
    }
  } else {
    const demoResult = runDemoRefine(currentDNA, question, answer, answeredLog);
    updatedDNA = demoResult.dna;
    followUpQuestions = demoResult.followUpQuestions;
    evidence = demoResult.evidence;
  }

  // 更新 answeredLog
  const newAnsweredLog: Record<string, string> = {
    ...answeredLog,
    [question.field]: answer,
    [question.id]: answer
  };

  // API 层保证当前用户回答立即写回，且只有用户输入能成为 confirmed。
  updatedDNA = normalizeDnaStatuses(updatedDNA);
  updatedDNA = mergeDnaAnswer(updatedDNA, question.field, answer);

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
