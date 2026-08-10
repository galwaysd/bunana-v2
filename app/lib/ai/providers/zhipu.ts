/**
 * 智谱 GLM 视觉模型 provider
 *
 * initial: 图片 + 文字 → FabricDNA
 * refine:  currentDNA + 追问答案 → 更新后的 FabricDNA
 */
import type { DemandResult, FabricDNA, FollowUpQuestion, ImagePayload } from "@/app/types";
import { sanitizeDNA, sanitizeFollowUpQuestions, sanitizeDemandResult, parseMaybeJson } from "../normalize";
import { buildInitialPrompt, buildRefinePrompt } from "@/app/lib/prompts";
import { createEmptyDNA, DNA_FIELD_KEYS, fillDnaDefaults, mergeDnaAnswer, normalizeDnaStatuses } from "@/app/lib/dna";

const aiRequestTimeoutMs = 45000;
const maxImages = 3;

// ===== 公共工具 =====

export function hasZhipuApiKey(): boolean {
  const key = configuredZhipuApiKey();
  return Boolean(
    key && !key.includes("your_") && !key.includes("请把") && !key.includes("粘贴")
  );
}

export function zhipuModel(): string {
  return process.env.ZHIPU_MODEL?.trim() || "glm-4v-flash";
}

function configuredZhipuApiKey(): string {
  return process.env.ZHIPU_API_KEY?.trim() || "";
}

function toZhipuImageUrl(value: string): string {
  if (value.startsWith("data:")) return value;

  const dataUrlMatch = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (dataUrlMatch) {
    return `data:${dataUrlMatch[1]};base64,${dataUrlMatch[2]}`;
  }

  return value;
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

  const content = message.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) {
          const text = (item as Record<string, unknown>).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
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
  language: string,
  model = zhipuModel()
): Promise<DemandResult> {
  const { systemPrompt, userPrompt } = buildInitialPrompt(
    text,
    (language === "en" ? "en" : "zh")
  );

  const imageParts = images.slice(0, maxImages).map((image) => ({
    type: "image_url" as const,
    image_url: { url: toZhipuImageUrl(image.dataUrl) }
  }));

  const response = await callZhipuAPI(systemPrompt, [
    { type: "text", text: userPrompt },
    ...imageParts
  ], model);

  const content = extractChatContent(response).trim();
  const parsed = parseMaybeJson(content);
  const result = sanitizeDemandResult(parsed);

  if (!content || (!parsed.dna || typeof parsed.dna !== "object" || Object.keys(parsed.dna).length === 0)) {
    const dna = buildStructuredDNAFromModelPayload(parsed, text);
    result.dna = dna;
  }

  // 新流程：保留 AI 推断的所有字段值，不强制清空；再为 AI 漏掉的空字段填上行业默认值
  result.dna = normalizeDnaStatuses(result.dna, false, undefined, true);
  result.dna = fillDnaDefaults(result.dna, text);

  return result;
}

// ===== refine 模式 =====

export async function runZhipuRefine(
  currentDNA: FabricDNA,
  question: FollowUpQuestion,
  answer: string,
  answeredLog: Record<string, string>,
  model = zhipuModel()
): Promise<{ dna: FabricDNA; followUpQuestions: FollowUpQuestion[] }> {
  const { systemPrompt, userPrompt } = buildRefinePrompt(
    JSON.stringify(currentDNA, null, 2),
    `${question.field}: ${question.question}`,
    answer,
    JSON.stringify(answeredLog, null, 2)
  );

  const response = await callZhipuAPI(systemPrompt, [
    { type: "text", text: userPrompt }
  ], model);

  const content = extractChatContent(response);
  const parsed = parseMaybeJson(content);
  const questions = sanitizeFollowUpQuestions(parsed.followUpQuestions);

  // 优先使用新的轻量格式：只返回更新的字段
  if (parsed.updatedFields && typeof parsed.updatedFields === "object") {
    const updatedFields = parsed.updatedFields as Record<string, unknown>;
    let merged = currentDNA;
    for (const key of DNA_FIELD_KEYS) {
      const raw = updatedFields[key];
      if (raw && typeof raw === "object") {
        const field = raw as Record<string, unknown>;
        merged = {
          ...merged,
          [key]: {
            value: field.value != null ? String(field.value) : answer,
            status: "confirmed",
            confidence: typeof field.confidence === "number" ? field.confidence : 1,
            source: "user_input"
          }
        };
      }
    }
    // 确保当前问题字段一定有值
    if (!updatedFields[question.field]) {
      merged = mergeDnaAnswer(merged, question.field, answer);
    }
    return { dna: normalizeDnaStatuses(merged, true, new Set([question.field])), followUpQuestions: questions };
  }

  // 兼容旧格式：返回完整 dna
  const rawDna = parsed.dna && typeof parsed.dna === "object" ? (parsed.dna as Record<string, unknown>) : parsed;
  const hasAllDnaFields = DNA_FIELD_KEYS.every((key) => rawDna[key] != null);

  if (hasAllDnaFields) {
    const dna = sanitizeDNA(rawDna);
    return { dna, followUpQuestions: questions };
  }

  // 兜底：本地合并答案
  console.warn("Zhipu refine returned incomplete DNA JSON; merging answer locally.", { question: question.field, answer });
  const merged = mergeDnaAnswer(currentDNA, question.field, answer);
  const dna = normalizeDnaStatuses(merged, true, new Set([question.field]));
  return { dna, followUpQuestions: questions };
}

// ===== API 调用核心 =====

function buildStructuredDNAFromModelPayload(parsed: Record<string, unknown>, text: string): FabricDNA {
  const dna = createEmptyDNA();

  for (const field of DNA_FIELD_KEYS) {
    dna[field] = {
      value: "",
      status: "inferred",
      confidence: 0.3,
      source: "inference"
    };
  }

  const demandCard = parsed.demandCard && typeof parsed.demandCard === "object"
    ? (parsed.demandCard as Record<string, unknown>)
    : {};
  const specs = demandCard.specs && typeof demandCard.specs === "object"
    ? (demandCard.specs as Record<string, unknown>)
    : {};
  const summary = typeof parsed.summary === "string" ? parsed.summary : "";
  const evidence = parsed.evidence && typeof parsed.evidence === "object"
    ? (parsed.evidence as Record<string, unknown>)
    : {};
  const confirmedList = Array.isArray(evidence.confirmed)
    ? evidence.confirmed.filter((item): item is string => typeof item === "string")
    : [];

  const normalizeTextValue = (value: string): string => {
    if (!value) return "";

    let text = value
      .replace(/\s+/g, "")
      .trim();

    try {
      const decoded = Buffer.from(text, "latin1").toString("utf8");
      if (decoded && /[\u4e00-\u9fff]/.test(decoded)) {
        text = decoded;
      }
    } catch {
      // ignore
    }

    return text.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  };

  const fillField = (
    field: keyof FabricDNA,
    value: unknown,
    status: FabricDNA[keyof FabricDNA]["status"] = "inferred",
    source: "text_extraction" | "inference" = "text_extraction",
    confidence = 0.6
  ) => {
    if (typeof value === "string") {
      const normalized = normalizeTextValue(value);
      if (normalized) {
        dna[field] = {
          value: normalized,
          status,
          confidence,
          source
        };
      }
    }
  };

  fillField("fabricName", demandCard.fabricName);
  fillField("use", demandCard.use);
  fillField("quantity", demandCard.quantity);
  fillField("destinationMarket", demandCard.destinationMarket);
  fillField("leadTime", demandCard.urgency);

  fillField("weightGsm", specs.GSM);
  fillField("width", specs.width);
  fillField("composition", specs.composition);
  fillField("coating", specs.coating);
  fillField("waterproof", specs.hydrostaticPressure || specs.waterproof);

  const normalizedText = text.trim();
  const colorMatch = normalizedText.match(/(黑色|白色|深灰|深灰色|藏青|军绿|卡其|灰色|红色|蓝色|绿色|黄色)/);
  if (colorMatch) fillField("color", colorMatch[1], "inferred", "text_extraction", 0.7);

  if (/防水|防泼水|抗水/.test(normalizedText)) {
    fillField("waterproof", /防水|防泼水|抗水/.exec(normalizedText)?.[0] || "防水", "inferred", "text_extraction", 0.7);
  }

  if (/牛津|平纹|斜纹|缎纹|塔丝隆|涤塔夫|春亚纺|涤纶|尼龙|棉|聚酯/.test(normalizedText)) {
    fillField("weave", /牛津|平纹|斜纹|缎纹/.exec(normalizedText)?.[0] || "平纹", "inferred", "text_extraction", 0.6);
    fillField("composition", /涤纶|尼龙|棉|聚酯/.exec(normalizedText)?.[0] || "按样", "inferred", "text_extraction", 0.6);
  }

  if (/面料/.test(summary) || /织物/.test(summary)) {
    fillField("features", "通用面料", "inferred", "inference", 0.4);
  }

  for (const item of confirmedList) {
    if (/颜色/i.test(item)) {
      const value = item.replace(/^颜色[:：]?/i, "").trim();
      if (value) fillField("color", value, "inferred", "text_extraction", 0.7);
    }
    if (/幅宽/i.test(item)) {
      const value = item.replace(/^幅宽[:：]?/i, "").trim();
      if (value) fillField("width", value, "inferred", "text_extraction", 0.7);
    }
    if (/起订/i.test(item)) {
      const value = item.replace(/^起订量[:：]?/i, "").trim();
      if (value) fillField("moq", value, "inferred", "text_extraction", 0.7);
    }
  }

  return dna;
}

async function callZhipuAPI(
  systemPrompt: string,
  userContent: Array<{ type: string; text?: string; image_url?: { url: string } }>,
  model = zhipuModel()
): Promise<unknown> {
  const apiKey = configuredZhipuApiKey();
  if (!apiKey) {
    throw new Error("ZHIPU_API_KEY is missing.");
  }

  const response = await fetchWithTimeout(zhipuApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
