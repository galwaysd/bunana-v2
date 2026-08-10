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
 * 当 AI 未返回某字段值时，用行业通用默认值填充。
 * 保持字段格式 { value, status: "inferred", confidence: 0.5, source: "inference" }。
 */
export function fillDnaDefaults(dna: FabricDNA, text: string = ""): FabricDNA {
  const normalized = text.toLowerCase();
  const hasKeyword = (kw: string | string[]) =>
    Array.isArray(kw) ? kw.some((k) => normalized.includes(k.toLowerCase())) : normalized.includes(kw.toLowerCase());

  const defaults: Record<keyof FabricDNA, string> = {
    fabricName: "未命名面料",
    use: "通用服装/用品",
    composition: hasKeyword(["尼龙", "锦纶"]) ? "尼龙" : hasKeyword(["涤纶", "聚酯"]) ? "涤纶" : "按样",
    weave: hasKeyword("牛津") ? "牛津" : hasKeyword("平纹") ? "平纹" : "平纹",
    weightGsm: hasKeyword(["轻薄", "尼丝纺", "涤塔夫"]) ? "约80-100gsm" : hasKeyword("牛津") ? "约200gsm" : "约150gsm",
    width: "约150cm",
    coating: hasKeyword(["防水", "防泼水", "涂层"]) ? "PU涂层" : "无",
    waterproof: hasKeyword(["防水", "防泼水"]) ? "防泼水" : "无",
    moq: "1000米起",
    quantity: "待定",
    destinationMarket: "待定",
    leadTime: "15-20天",
    color: "按图片",
    features: hasKeyword(["户外", "运动", "背包"]) ? "耐磨、户外适用" : "通用面料"
  };

  const next: FabricDNA = { ...dna };
  for (const key of DNA_FIELD_KEYS) {
    const field = dna[key];
    const value = field.value.trim();
    if (!value || value === "—" || value === "待确认" || value === "需确认") {
      next[key] = {
        value: defaults[key],
        status: "inferred",
        confidence: 0.5,
        source: "inference"
      };
    }
  }
  return next;
}

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
