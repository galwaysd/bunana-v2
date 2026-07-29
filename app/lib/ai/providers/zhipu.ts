/**
 * 智谱 GLM 视觉模型 provider
 *
 * initial: 图片 + 文字 → FabricDNA
 * refine:  currentDNA + 追问答案 → 更新后的 FabricDNA
 */
import type { DemandResult, FabricDNA, FollowUpQuestion, ImagePayload } from "@/app/types";
import { sanitizeDNA, sanitizeFollowUpQuestions, sanitizeDemandResult, parseMaybeJson, ensureUsableResult } from "../normalize";
import { buildInitialPrompt, buildRefinePrompt } from "@/app/lib/prompts";
import { runDemoInitial, runDemoRefine } from "../demo";

const aiRequestTimeoutMs = 20000;
const maxImages = 3;

// ===== 公共工具 =====

export function hasZhipuApiKey(): boolean {
  const key = process.env.ZHIPU_API_KEY?.trim();
  return Boolean(
    key && !key.includes("your_") && !key.includes("请把") && !key.includes("粘贴")
  );
}

export function zhipuModel(): string {
  return process.env.ZHIPU_MODEL || "GLM-4.6V-Flash";
}

export function zhipuApiUrl(): string {
  return (
    process.env.ZHIPU_API_URL ||
    "https://open.bigmodel.cn/api/paas/v4/chat/completions"
  );
}

export function extractChatContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const choices = "choices" in payload ? payload.choices : undefined;
  if (!Array.isArray(choices)) return "";
  const first = choices[0];
  if (!first || typeof first !== "object" || !("message" in first)) return "";
  const message = first.message;
  if (!message || typeof message !== "object" || !("content" in message)) return "";
  return typeof message.content === "string" ? message.content : "";
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = aiRequestTimeoutMs
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: init.signal ?? controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ===== initial 模式 =====

export async function runZhipuInitial(
  text: string,
  images: ImagePayload[],
  language: string
): Promise<DemandResult> {
  const { systemPrompt, userPrompt } = buildInitialPrompt(
    text,
    (language === "en" ? "en" : "zh")
  );

  const imageParts = images.slice(0, maxImages).map((image) => ({
    type: "image_url" as const,
    image_url: { url: image.dataUrl }
  }));

  const response = await callZhipuAPI(systemPrompt, [
    { type: "text", text: userPrompt },
    ...imageParts
  ]);

  const content = extractChatContent(response);
  return ensureUsableResult(
    sanitizeDemandResult(parseMaybeJson(content)),
    runDemoInitial(text, images, language)
  );
}

// ===== refine 模式 =====

export async function runZhipuRefine(
  currentDNA: FabricDNA,
  question: FollowUpQuestion,
  answer: string,
  answeredLog: Record<string, string>
): Promise<{ dna: FabricDNA; followUpQuestions: FollowUpQuestion[] }> {
  const { systemPrompt, userPrompt } = buildRefinePrompt(
    JSON.stringify(currentDNA, null, 2),
    `${question.field}: ${question.question}`,
    answer,
    JSON.stringify(answeredLog, null, 2)
  );

  const response = await callZhipuAPI(systemPrompt, [
    { type: "text", text: userPrompt }
  ]);

  const content = extractChatContent(response);
  const parsed = parseMaybeJson(content);

  // 尝试解析 AI 返回的 dna + followUpQuestions
  const dna = sanitizeDNA(parsed.dna || parsed);
  const questions = sanitizeFollowUpQuestions(parsed.followUpQuestions);

  // 如果 AI 返回有效 dna（至少有 fabricName），使用它
  if (dna.fabricName?.value) {
    return { dna, followUpQuestions: questions };
  }

  // 否则使用 demo 兜底
  return runDemoRefine(currentDNA, question, answer, answeredLog);
}

// ===== API 调用核心 =====

async function callZhipuAPI(
  systemPrompt: string,
  userContent: Array<{ type: string; text?: string; image_url?: { url: string } }>
): Promise<unknown> {
  const model = zhipuModel();
  const response = await fetchWithTimeout(zhipuApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    let zhipuCode = "";
    try {
      const errJson = JSON.parse(body);
      zhipuCode = String(errJson?.error?.code || "");
    } catch {
      // non-JSON error body
    }
    const error = new Error(`Zhipu GLM(${model}) failed: ${body}`);
    (error as unknown as Record<string, unknown>).zhipuCode = zhipuCode;
    throw error;
  }

  return response.json();
}
