import type { FabricDNA, FabricField } from "@/app/types";

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
 * DNA → specs 字符串（克重/成分/织法/幅宽等）
 */
export function buildSpecsFromDNA(dna: FabricDNA): string {
  const parts: string[] = [];
  if (dna.weightGsm.value) parts.push(dna.weightGsm.value);
  if (dna.composition.value) parts.push(dna.composition.value);
  if (dna.weave.value) parts.push(dna.weave.value);
  if (dna.width.value) parts.push(`幅宽${dna.width.value}`);
  if (dna.waterproof.value) parts.push(dna.waterproof.value);
  if (dna.coating.value) parts.push(`${dna.coating.value}涂层`);
  if (dna.color.value) parts.push(dna.color.value);
  if (dna.features.value) parts.push(dna.features.value);
  return parts.length > 0 ? parts.join("，") : "待确认";
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
 * 从 text 中判定需求模式：找布（缺配）还是 有布（供应）
 */
export function inferDemandMode(text: string): "找" | "有" {
  const supplierPatterns = ["我有", "供应", "现货", "库存", "厂家", "工厂", "可供", "出售", "卖"];
  return supplierPatterns.some((p) => text.includes(p)) ? "有" : "找";
}
