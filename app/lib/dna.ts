import type { FabricDNA, FabricField, FieldStatus } from "@/app/types";

/**
 * 创建空 FabricField
 */
export function createEmptyField(): FabricField {
  return { value: "", status: "missing", confidence: 0, source: "inference" };
}

/**
 * 创建全空 FabricDNA（14 字段均为 missing）
 */
export function createEmptyDNA(): FabricDNA {
  return {
    fabricName: createEmptyField(),
    use: createEmptyField(),
    composition: createEmptyField(),
    weave: createEmptyField(),
    weightGsm: createEmptyField(),
    width: createEmptyField(),
    coating: createEmptyField(),
    waterproof: createEmptyField(),
    moq: createEmptyField(),
    quantity: createEmptyField(),
    destinationMarket: createEmptyField(),
    leadTime: createEmptyField(),
    color: createEmptyField(),
    features: createEmptyField()
  };
}

/**
 * FabricDNA 所有字段的英文 key 列表
 */
export const DNA_FIELD_KEYS: (keyof FabricDNA)[] = [
  "fabricName", "use", "composition", "weave", "weightGsm",
  "width", "coating", "waterproof", "moq", "quantity",
  "destinationMarket", "leadTime", "color", "features"
];

export const FABRIC_DNA_CARD_FIELDS: readonly (keyof FabricDNA)[] = [
  "fabricName",
  "use",
  "composition",
  "weave",
  "weightGsm",
  "width",
  "coating",
  "waterproof",
  "moq",
  "leadTime",
  "color",
  "features"
];

/**
 * done 判定只检查 10 个 spec 字段。
 * fabricName 和 use 由 AI inferred 生成，不参与追问/done。
 */
export const FABRIC_DNA_REQUIRED_FIELDS: readonly (keyof FabricDNA)[] = [
  "composition",
  "weave",
  "weightGsm",
  "width",
  "coating",
  "waterproof",
  "moq",
  "leadTime",
  "color",
  "features"
];

const EXPLICIT_INPUT_ONLY_FIELDS = new Set<keyof FabricDNA>([
  "weightGsm",
  "width",
  "moq",
  "quantity",
  "destinationMarket",
  "leadTime"
]);

const EXPLICIT_INPUT_EVIDENCE: Record<
  "weightGsm" | "width" | "moq" | "quantity" | "destinationMarket" | "leadTime",
  readonly RegExp[]
> = {
  weightGsm: [
    /(?:克重|weight)\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:gsm|g\s*[/／]\s*(?:m2|m²|㎡)|克(?:\s*[/／]\s*平方米)?)/i,
    /\d+(?:\.\d+)?\s*(?:gsm|g\s*[/／]\s*(?:m2|m²|㎡)|克\s*[/／]\s*平方米)/i
  ],
  width: [
    /(?:幅宽|门幅|width)\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:cm|厘米|m|米|inch|inches|英寸)/i,
    /\d+(?:\.\d+)?\s*(?:cm|厘米|m|米|inch|inches|英寸)\s*(?:幅宽|门幅|宽)/i
  ],
  moq: [
    /(?:moq|起订(?:量)?|最小(?:订单|订购量|起订量))\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:米|码|件|公斤|kg|yards?|pcs?)?/i
  ],
  quantity: [
    /(?:数量|采购量|需求量|米数|码数|件数)\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:米|码|件|公斤|kg|yards?|pcs?)?/i
  ],
  destinationMarket: [
    /(?:目标市场|目的市场|destination\s*market|market)\s*[:：]?\s*[\p{L}][\p{L}\s-]*/iu,
    /(?:出口|销往|发往)\s*[:：]?\s*[\p{L}][\p{L}\s-]*/iu,
    /(?:内销|国内市场)/i
  ],
  leadTime: [
    /(?:交期|交货期|货期|交付周期|lead\s*time|delivery)\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:天|日|周|星期|个月|月|days?|weeks?|months?)/i,
    /\d+(?:\.\d+)?\s*(?:天|日|周|星期|个月|月|days?|weeks?|months?)\s*(?:交货|交付|出货|delivery)/i
  ]
};

function hasExplicitInputEvidence(
  key: keyof FabricDNA,
  rawText: string
): boolean {
  if (!EXPLICIT_INPUT_ONLY_FIELDS.has(key)) return true;
  const patterns = EXPLICIT_INPUT_EVIDENCE[key as keyof typeof EXPLICIT_INPUT_EVIDENCE];
  return patterns.some((pattern) => pattern.test(rawText));
}

/**
 * 清除只能由用户明确输入/确认、却被图片分析或模型推断生成的业务字段。
 */
export function enforceExplicitInputOnlyFields(
  dna: FabricDNA,
  rawText: string
): FabricDNA {
  const guarded = { ...dna };

  for (const key of EXPLICIT_INPUT_ONLY_FIELDS) {
    const field = dna[key];
    const isConfirmedUserInput =
      field.source === "user_input" && field.status === "confirmed";

    if (isConfirmedUserInput) {
      guarded[key] = field;
      continue;
    }

    guarded[key] =
      hasExplicitInputEvidence(key, rawText) && field.value.trim()
        ? { ...field, source: "text_extraction" }
        : createEmptyField();
  }

  return guarded;
}

const RELIABILITY_SENSITIVE_FIELDS = new Set<keyof FabricDNA>([
  "fabricName",
  "use",
  "coating",
  "waterproof",
  "features"
]);

export type FabricDNAStats = Record<FieldStatus, number> & { total: number };

export function getFabricDNAStats(
  dna: FabricDNA,
  fields: readonly (keyof FabricDNA)[] = FABRIC_DNA_CARD_FIELDS
): FabricDNAStats {
  const stats: FabricDNAStats = {
    identified: 0,
    inferred: 0,
    confirmed: 0,
    missing: 0,
    total: fields.length
  };

  for (const key of fields) stats[dna[key].status] += 1;
  return stats;
}

/**
 * 判断 DNA 是否可发布。
 *
 * 新流程：AI 自动填满所有字段后，只要 dna 存在即可发布。
 * 用户手动编辑后字段变为 confirmed，未编辑的 inferred 也视为可接受。
 */
export function isFabricDNAQuestionnaireComplete(dna: FabricDNA): boolean {
  // AI 自动填充模式下，只要 DNA 有内容就可以视为 ready to publish
  const stats = getFabricDNAStats(dna);
  return stats.identified + stats.inferred + stats.confirmed >= 6;
}

/**
 * 字段中文标签映射
 */
export const DNA_FIELD_LABELS: Record<keyof FabricDNA, string> = {
  fabricName: "面料名称",
  use: "用途",
  composition: "成分",
  weave: "织法",
  weightGsm: "克重",
  width: "幅宽",
  coating: "涂层",
  waterproof: "防水",
  moq: "起订量",
  quantity: "数量",
  destinationMarket: "目标市场",
  leadTime: "交期",
  color: "颜色",
  features: "特性"
};

/**
 * DNA → specs 字符串（结构化格式：key:value|key:value）
 * 详情页通过 parseSpecsIntoGrid 解析，用 i18n 翻译每个字段名。
 */
export function buildSpecsFromDNA(dna: FabricDNA): string {
  const parts: string[] = [];
  if (dna.weightGsm.value) parts.push(`weightGsm:${dna.weightGsm.value}`);
  if (dna.composition.value) parts.push(`composition:${dna.composition.value}`);
  if (dna.weave.value) parts.push(`weave:${dna.weave.value}`);
  if (dna.width.value) parts.push(`width:${dna.width.value}`);
  if (dna.waterproof.value) parts.push(`waterproof:${dna.waterproof.value}`);
  if (dna.coating.value) parts.push(`coating:${dna.coating.value}`);
  if (dna.color.value) parts.push(`color:${dna.color.value}`);
  if (dna.features.value) parts.push(`features:${dna.features.value}`);
  return parts.length > 0 ? parts.join("|") : "待确认";
}

/**
 * 从 specs 字符串中提取纯值列表（兼容新格式 key:value|key:value 和旧格式 逗号分隔）
 */
export function parseSpecsValues(specs: string): string[] {
  if (!specs || specs === "待确认" || specs === "TBD" || specs === "未定" || specs === "미정") return [];

  // 新格式：key:value|key:value
  if (specs.includes("|")) {
    return specs
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => {
        const colonIdx = s.indexOf(":");
        return colonIdx > 0 ? s.slice(colonIdx + 1).trim() : s;
      })
      .filter((s) => s.length > 0);
  }

  // 旧格式：逗号分隔
  return specs
    .split(/[，,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 获取 DNA 中状态为 missing 的字段列表
 */
export function getMissingFields(dna: FabricDNA): (keyof FabricDNA)[] {
  return DNA_FIELD_KEYS.filter((key) => dna[key].status === "missing");
}

/**
 * 将用户回答合并到 DNA 的指定字段
 */
export function mergeDnaAnswer(
  dna: FabricDNA,
  field: keyof FabricDNA,
  answer: string
): FabricDNA {
  return {
    ...dna,
    [field]: {
      value: answer,
      status: "confirmed",
      confidence: 1,
      source: "user_input"
    }
  };
}

/**
 * 统一字段状态语义。
 *
 * keepInferences=true：新流程用，保留所有 AI 推断值，
 *   仅把显式空的字段设为 missing，其余保留 inferred/identified。
 * keepInferences=false：旧流程用，严格清除不可靠字段。
 */
export function normalizeDnaStatuses(
  dna: FabricDNA,
  allowUserConfirmed = true,
  confirmedFields?: ReadonlySet<keyof FabricDNA>,
  keepInferences = false
): FabricDNA {
  const normalized = { ...dna };

  for (const key of DNA_FIELD_KEYS) {
    const field = dna[key];
    const value = field.value.trim();

    if (!value && !keepInferences) {
      normalized[key] = createEmptyField();
      continue;
    }

    const userConfirmationAllowed =
      allowUserConfirmed &&
      field.source === "user_input" &&
      (!confirmedFields || confirmedFields.has(key));

    if (userConfirmationAllowed) {
      normalized[key] = { ...field, value, status: "confirmed", confidence: 1 };
      continue;
    }

    if (keepInferences) {
      // 新流程：保留所有 AI 推断值，不回退
      normalized[key] = { ...field, value, status: field.value ? "inferred" : "missing" };
      continue;
    }

    const source = field.source === "user_input" ? "inference" : field.source;

    if (
      EXPLICIT_INPUT_ONLY_FIELDS.has(key) &&
      source !== "text_extraction"
    ) {
      normalized[key] = createEmptyField();
      continue;
    }

    if (
      RELIABILITY_SENSITIVE_FIELDS.has(key) &&
      source !== "text_extraction" &&
      field.confidence < 0.7
    ) {
      normalized[key] = createEmptyField();
      continue;
    }

    normalized[key] = { ...field, value, source, status: "inferred" };
  }

  return normalized;
}

/**
 * 从 text 中判定需求模式：找布（缺配）还是 有布（供应）
 */
export function inferDemandMode(text: string): "找" | "有" {
  const supplierPatterns = ["我有", "供应", "现货", "库存", "厂家", "工厂", "可供", "出售", "卖"];
  return supplierPatterns.some((p) => text.includes(p)) ? "有" : "找";
}
