/**
 * AI 响应标准化 —— 将智谱/Dify 的原始输出统一转换为标准
 * FabricDNA + FollowUpQuestion[] + DemandEvidence 格式。
 */
import type {
  FabricDNA,
  FabricField,
  FieldStatus,
  FieldSource,
  DemandCard,
  DemandEvidence,
  FollowUpQuestion,
  DemandResult,
  ImagePayload
} from "@/app/types";
import { createEmptyDNA, DNA_FIELD_KEYS, normalizeDnaStatuses } from "@/app/lib/dna";

// ===== 工具函数 =====

export function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function numberValue(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = value.trim().toLowerCase();
    if (n === "高" || n === "high") return 0.85;
    if (n === "中" || n === "medium") return 0.65;
    if (n === "低" || n === "low") return 0.4;
    const p = Number(n);
    if (Number.isFinite(p)) return p;
  }
  return fallback;
}

export function parseMaybeJson(value: string): Record<string, unknown> {
  const normalized = value.trim();
  if (!normalized) return {};

  try {
    return JSON.parse(normalized);
  } catch {
    const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        // fall through
      }
    }

    const objectMatch = normalized.match(/(\{[\s\S]*\})/);
    if (objectMatch?.[1]) {
      try {
        return JSON.parse(objectMatch[1]);
      } catch {
        // fall through
      }
    }

    const keyValueMatch = normalized.match(/"([^"]+)"\s*:\s*"([^"]*)"/);
    if (keyValueMatch) {
      return { [keyValueMatch[1]]: keyValueMatch[2] };
    }

    return {};
  }
}

export function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("图片格式无效。");
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

export function mimeToExtension(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

// ===== FabricDNA 标准化 =====

function isValidFieldStatus(v: unknown): v is FieldStatus {
  return v === "identified" || v === "inferred" || v === "confirmed" || v === "missing";
}

function isValidFieldSource(v: unknown): v is FieldSource {
  return v === "image_analysis" || v === "text_extraction" || v === "inference" || v === "user_input";
}

export function sanitizeDNA(value: unknown, keepInferences = false): FabricDNA {
  const dna = createEmptyDNA();
  if (!value || typeof value !== "object") return dna;

  const source = value as Record<string, unknown>;
  for (const field of DNA_FIELD_KEYS) {
    const raw = source[field];
    if (raw == null) continue;

    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const f = raw as Record<string, unknown>;
      dna[field] = {
        value: f.value != null ? String(f.value) : "",
        status: isValidFieldStatus(f.status) ? (f.status as FieldStatus) : "missing",
        confidence:
          typeof f.confidence === "number" && f.confidence >= 0 && f.confidence <= 1
            ? f.confidence
            : 0,
        source: isValidFieldSource(f.source) ? (f.source as FieldSource) : "inference"
      };
      continue;
    }

    const textValue = typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean"
      ? String(raw).trim()
      : "";

    if (textValue) {
      dna[field] = {
        value: textValue,
        status: "inferred",
        confidence: 0.7,
        source: "inference"
      };
    }
  }
  return normalizeDnaStatuses(dna, false, undefined, keepInferences);
}

// ===== FollowUpQuestions 标准化 =====

export function sanitizeFollowUpQuestions(value: unknown): FollowUpQuestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      field: String(item.field ?? "") as keyof FabricDNA,
      question: String(item.question ?? ""),
      options: Array.isArray(item.options) ? item.options.map((o) => String(o)) : []
    }))
    .filter((q) => q.id && q.field && q.question)
    .slice(0, 4);
}

// ===== Evidence 标准化 =====

export function sanitizeEvidence(value: unknown): DemandEvidence {
  const source =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    observed: stringList(source.observed),
    inferred: stringList(source.inferred),
    confirmed: stringList(source.confirmed),
    unknown: stringList(source.unknown),
    followUpQuestions: stringList(source.followUpQuestions).slice(0, 4)
  };
}

export function mergeEvidence(
  primary: DemandEvidence,
  fallback: DemandEvidence
): DemandEvidence {
  return {
    observed: primary.observed.length > 0 ? primary.observed : fallback.observed,
    inferred: primary.inferred.length > 0 ? primary.inferred : fallback.inferred,
    confirmed: primary.confirmed.length > 0 ? primary.confirmed : fallback.confirmed,
    unknown: primary.unknown.length > 0 ? primary.unknown : fallback.unknown,
    followUpQuestions:
      primary.followUpQuestions.length > 0
        ? primary.followUpQuestions.slice(0, 4)
        : fallback.followUpQuestions.slice(0, 4)
  };
}

// ===== DemandResult 标准化 =====

export function sanitizeDemandResult(value: unknown): DemandResult {
  const source =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const card =
    source.demandCard && typeof source.demandCard === "object"
      ? (source.demandCard as Record<string, unknown>)
      : {};

  return {
    category: stringValue(source.category, "其他面料"),
    dna: sanitizeDNA(source.dna),
    demandCard: {
      fabricName: stringValue(card.fabricName, ""),
      use: stringValue(card.use, ""),
      specs: stringValue(card.specs, ""),
      quantity: stringValue(card.quantity, ""),
      destinationMarket: stringValue(card.destinationMarket, ""),
      urgency: stringValue(card.urgency, ""),
      notes: stringValue(card.notes, "")
    },
    missingFields: stringList(source.missingFields),
    keywords: stringList(source.keywords),
    summary: stringValue(source.summary, "已整理为面料需求卡。"),
    confidence: numberValue(source.confidence, 0.6),
    evidence: sanitizeEvidence(source.evidence),
    followUpQuestions: sanitizeFollowUpQuestions(source.followUpQuestions)
  };
}

// ===== 追问问题构建 =====
// 抽离到独立文件以便 client/server 共用
export {
  buildStructuredFollowUpQuestions,
  filterAnsweredQuestions
} from "@/app/lib/followUp";

function mergeDNA(primary: FabricDNA, fallback: FabricDNA): FabricDNA {
  const merged = createEmptyDNA();
  for (const key of DNA_FIELD_KEYS) {
    merged[key] = primary[key].value ? primary[key] : fallback[key];
  }
  return normalizeDnaStatuses(merged, false);
}
