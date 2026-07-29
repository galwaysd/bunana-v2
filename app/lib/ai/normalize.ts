/**
 * AI 响应标准化 —— 将智谱/Dify/demo 各 provider 的原始输出
 * 统一转换为标准 FabricDNA + FollowUpQuestion[] + DemandEvidence 格式。
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
import { createEmptyDNA, DNA_FIELD_KEYS } from "@/app/lib/dna";

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
  try {
    return JSON.parse(value);
  } catch {
    const match =
      value.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
      value.match(/(\{[\s\S]*\})/);
    if (!match?.[1]) return {};
    try {
      return JSON.parse(match[1]);
    } catch {
      return {};
    }
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

export function sanitizeDNA(value: unknown): FabricDNA {
  const dna = createEmptyDNA();
  if (!value || typeof value !== "object") return dna;

  const source = value as Record<string, unknown>;
  for (const field of DNA_FIELD_KEYS) {
    const raw = source[field];
    if (raw && typeof raw === "object") {
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
    }
  }
  return dna;
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

export function buildStructuredFollowUpQuestions(dna: FabricDNA): FollowUpQuestion[] {
  const questionCandidates: Array<{
    id: string;
    field: keyof FabricDNA;
    question: string;
    options: string[];
    priority: number;
  }> = [];

  const Q: Record<string, { field: keyof FabricDNA; question: string; options: string[]; priority: number }> = {
    weightGsm: {
      field: "weightGsm",
      question: "克重大概在什么范围？",
      options: ["60-80gsm", "100-120gsm", "150gsm+", "不确定"],
      priority: 1
    },
    width: {
      field: "width",
      question: "幅宽需要多少？",
      options: ["150cm", "180cm", "210cm+", "不确定"],
      priority: 2
    },
    coating: {
      field: "coating",
      question: "需要什么涂层处理？",
      options: ["PU涂层", "PA涂层", "PVC涂层", "不需要涂层"],
      priority: 3
    },
    moq: {
      field: "moq",
      question: "最小起订量是多少？",
      options: ["1000米", "3000米", "5000米", "面议"],
      priority: 4
    },
    composition: {
      field: "composition",
      question: "面料成分是什么？",
      options: ["涤纶", "尼龙", "棉涤混纺", "不确定"],
      priority: 5
    },
    weave: {
      field: "weave",
      question: "需要什么织法？",
      options: ["平纹", "斜纹", "牛津", "缎纹"],
      priority: 6
    },
    waterproof: {
      field: "waterproof",
      question: "防水等级有具体要求吗？",
      options: ["普通防泼水", "PU800", "PU1500+", "不需要防水"],
      priority: 7
    },
    leadTime: {
      field: "leadTime",
      question: "交期有什么要求？",
      options: ["现货", "7天内", "15天内", "30天内"],
      priority: 8
    },
    color: {
      field: "color",
      question: "颜色有什么偏好？",
      options: ["黑色", "藏青", "军绿", "卡其"],
      priority: 9
    },
    features: {
      field: "features",
      question: "需要任何特殊工艺或特性吗？",
      options: ["阻燃", "抗UV", "防静电", "不需要"],
      priority: 10
    }
  };

  for (const [fieldKey, def] of Object.entries(Q)) {
    const f = dna[fieldKey as keyof FabricDNA];

    // missing → must ask
    if (f.status === "missing") {
      questionCandidates.push({ id: `q_${fieldKey}`, ...def });
      continue;
    }

    // inferred + low confidence (≤0.6) → ask
    if (f.status === "inferred" && f.confidence <= 0.6) {
      questionCandidates.push({ id: `q_${fieldKey}`, ...def });
    }
  }

  questionCandidates.sort((a, b) => a.priority - b.priority);
  return questionCandidates;
}

// ===== ensureUsableResult —— 兜底保证结果可用 =====

export function ensureUsableResult(
  result: DemandResult,
  fallback: DemandResult
): DemandResult {
  const demandCard: DemandCard = {
    fabricName: result.demandCard.fabricName || fallback.demandCard.fabricName,
    use: result.demandCard.use || fallback.demandCard.use,
    specs: result.demandCard.specs || fallback.demandCard.specs,
    quantity: result.demandCard.quantity || fallback.demandCard.quantity,
    destinationMarket:
      result.demandCard.destinationMarket || fallback.demandCard.destinationMarket,
    urgency: result.demandCard.urgency || fallback.demandCard.urgency,
    notes: result.demandCard.notes || fallback.demandCard.notes
  };

  const safe: DemandResult = {
    category: result.category && result.category !== "其他面料"
      ? result.category
      : fallback.category,
    dna: result.dna?.fabricName?.value ? result.dna : fallback.dna,
    demandCard,
    missingFields:
      result.missingFields.length > 0 ? result.missingFields : fallback.missingFields,
    keywords: result.keywords.length > 0 ? result.keywords : fallback.keywords,
    summary: result.summary || fallback.summary,
    confidence: result.confidence || fallback.confidence,
    evidence: mergeEvidence(result.evidence, fallback.evidence),
    followUpQuestions:
      result.followUpQuestions.length > 0
        ? result.followUpQuestions
        : fallback.followUpQuestions
  };

  // Always regenerate structured followUpQuestions from the final dna (initial only, limit 4)
  safe.followUpQuestions = buildStructuredFollowUpQuestions(safe.dna).slice(0, 4);

  return safe;
}

// ===== refine 专用的 DNA 合并结果 =====

/**
 * 去重：将新的 followUpQuestions 与已回答记录对比，排除已回答的字段
 */
export function filterAnsweredQuestions(
  questions: FollowUpQuestion[],
  answeredLog: Record<string, string>
): FollowUpQuestion[] {
  return questions.filter(
    (q) => !answeredLog[q.field] && !answeredLog[q.id]
  );
}
