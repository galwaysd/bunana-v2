/**
 * Demo/Rules 兜底 —— 不依赖外部 AI API，纯规则引擎。
 * 支持两种模式：initial（首次分析）+ refine（追问后更新 DNA）。
 */
import type { FabricDNA, FabricField, DemandCard, DemandEvidence, FollowUpQuestion, DemandResult, ImagePayload } from "@/app/types";
import { createEmptyDNA, buildSpecsFromDNA } from "@/app/lib/dna";
import { buildStructuredFollowUpQuestions, mergeEvidence, filterAnsweredQuestions } from "./normalize";
import { mergeDnaAnswer } from "@/app/lib/dna";

// ===== 工厂函数 =====

function dnaField(
  value: string,
  status: "identified" | "inferred" | "confirmed" | "missing",
  confidence: number,
  source: "image_analysis" | "text_extraction" | "inference" | "user_input"
): FabricField {
  return { value, status, confidence, source };
}

const hiddenParameterLabels = [
  "丹尼数", "克重", "幅宽", "成分", "涂层", "水压", "MOQ"
];

// ===== initial 模式 =====

export function runDemoInitial(text: string, images: ImagePayload[], language: string): DemandResult {
  const category = inferCategory(text);
  const dna = buildDemoDNA(text, category, images);
  const result: DemandResult = {
    category,
    dna,
    demandCard: {
      fabricName: dna.fabricName.value,
      use: dna.use.value,
      specs: buildSpecsFromDNA(dna) || extractSpecs(text),
      quantity: dna.quantity.value || extractQuantity(text),
      destinationMarket: dna.destinationMarket.value || extractMarket(text),
      urgency: deriveUrgency(dna),
      notes: images.length > 0
        ? "已附图片，图片只作为可见特征参考，不覆盖文字需求。"
        : "未附图片。"
    },
    missingFields: inferMissingFields(text),
    keywords: buildKeywords(text, category),
    summary: `已将「${text}」整理为${category}需求卡。`,
    confidence: 0.68,
    evidence: createDefaultEvidence(text, images),
    followUpQuestions: []
  };

  applySafetyRules(result, text, images);

  // Regenerate structured followUpQuestions from final dna (initial mode: max 4)
  result.followUpQuestions = buildStructuredFollowUpQuestions(result.dna).slice(0, 4);

  return result;
}

// ===== refine 模式 =====

export function runDemoRefine(
  currentDNA: FabricDNA,
  question: FollowUpQuestion,
  answer: string,
  answeredLog: Record<string, string>
): DemandResult {
  // 1. 更新对应 DNA 字段
  let updatedDNA = mergeDnaAnswer(currentDNA, question.field, answer);

  // 2. 更新 answeredLog
  const newAnsweredLog: Record<string, string> = {
    ...answeredLog,
    [question.field]: answer,
    [question.id]: answer
  };

  // 3. 重新生成追问，过滤已回答的（最多 4 个）
  let questions = buildStructuredFollowUpQuestions(updatedDNA).slice(0, 4);
  questions = filterAnsweredQuestions(questions, newAnsweredLog);

  // 4. 如果答案中包含额外规格信息，也提取到 DNA
  updatedDNA = extractAdditionalInfo(updatedDNA, answer, newAnsweredLog);

  return {
    category: "",
    dna: updatedDNA,
    demandCard: {
      fabricName: updatedDNA.fabricName.value || "",
      use: updatedDNA.use.value || "",
      specs: buildSpecsFromDNA(updatedDNA),
      quantity: updatedDNA.quantity.value || "",
      destinationMarket: updatedDNA.destinationMarket.value || "",
      urgency: deriveUrgency(updatedDNA),
      notes: ""
    },
    missingFields: [],
    keywords: [],
    summary: "",
    confidence: 1,
    evidence: {
      observed: [],
      inferred: [],
      confirmed: [`${question.field}: ${answer}`],
      unknown: [],
      followUpQuestions: questions.map((q) => q.question)
    },
    followUpQuestions: questions
  };
}

/**
 * 尝试从用户回答中提取额外字段信息
 * 例如回答"110gsm 防水"时提取克重和防水
 */
function extractAdditionalInfo(
  dna: FabricDNA,
  answer: string,
  answeredLog: Record<string, string>
): FabricDNA {
  let updated = { ...dna };

  // 克重提取
  const gsmMatch = answer.match(/(\d{2,4})\s*(?:gsm|克|g\/m2|g\/㎡)/i);
  if (gsmMatch && !answeredLog["weightGsm"]) {
    updated = mergeDnaAnswer(updated, "weightGsm", gsmMatch[0]);
  }

  // 防水提取
  if (/防水|防泼水|抗水/i.test(answer) && !answeredLog["waterproof"]) {
    updated = mergeDnaAnswer(updated, "waterproof", answer.match(/PU\d+|普通防泼水|防水/)?.[0] || "防水");
  }

  // 幅宽提取
  const widthMatch = answer.match(/(\d{2,3})\s*(?:cm|厘米|公分)/i);
  if (widthMatch && !answeredLog["width"]) {
    updated = mergeDnaAnswer(updated, "width", widthMatch[0]);
  }

  // 涂层提取
  if (/(?:PU|PA|PVC|TPU)\s*涂层/i.test(answer) && !answeredLog["coating"]) {
    updated = mergeDnaAnswer(updated, "coating", answer.match(/(?:PU|PA|PVC|TPU)\s*涂层/i)?.[0] || "涂层");
  }

  // 颜色提取
  const colorWords = ["黑色", "白色", "藏青", "军绿", "卡其", "灰色", "红色", "蓝色", "绿色", "黄色"];
  for (const c of colorWords) {
    if (answer.includes(c) && !answeredLog["color"]) {
      updated = mergeDnaAnswer(updated, "color", c);
      break;
    }
  }

  return updated;
}

// ===== 文字提取规则 =====

function buildDemoDNA(text: string, category: string, images: ImagePayload[]): FabricDNA {
  const dna = createEmptyDNA();

  // 面料名称提取: "210D牛津布", "190T涤塔夫", "春亚纺" 等
  // 注意：\S{1,8} 不能跨标点，必须在逗号/句号等处停止
  const fabricMatch = text.match(
    /(\d{2,4}[dDT]\s*[\u4e00-\u9fa5A-Za-z]{1,8}布|\d{2,4}[dDT]\s*[\u4e00-\u9fa5A-Za-z]{1,8}|春亚纺|涤塔夫|尼丝纺|塔丝隆|牛津布)/
  );
  if (fabricMatch) {
    dna.fabricName = dnaField(fabricMatch[0], "identified", 0.95, "text_extraction");
  }

  // 用途提取: 支持 "用于XX", "用来做XX", "雨伞用防水布", "箱包用面料" 等模式
  const useMatch = text.match(
    /(?:做|用于|来做|做点|用来做)\s*([^，,。；!！\s]{2,12}(?:背包|箱包|帐篷|窗帘|衣服|服装|包|袋)?)/
  );
  const usePrefixMatch = text.match(
    /([^，,。；!！\s]{2,12})?(?:用|用来)([^，,。；!！\s]{2,12})/
  );
  const useFallback = text.match(
    /(?:户外|旅行|登山|骑行|运动|酒店|家居|医疗|工业)(?:背包|箱包|帐篷|窗帘|服装)/
  );
  const extractedUse = useMatch?.[1] || usePrefixMatch?.[1] || usePrefixMatch?.[2] || useFallback?.[0];
  if (extractedUse) {
    dna.use = dnaField(extractedUse, "identified", 0.9, "text_extraction");
  }

  // 数量提取
  const qtyMatch = text.match(/(\d[\d,.]*\s*(?:万|千|百)?\s*(?:米|码|吨|kg|公斤|卷|匹))/i);
  if (qtyMatch) {
    dna.quantity = dnaField(qtyMatch[0], "identified", 0.9, "text_extraction");
  }

  // 目标市场
  const marketMatch = text.match(/(?:出口|外销|销往|卖到|出到)\s*([^，,。；;！!\s]{2,8})/);
  if (marketMatch) {
    dna.destinationMarket = dnaField(marketMatch[1], "identified", 0.9, "text_extraction");
  }

  // 加急
  if (/急|urgent|加急|越快越好/i.test(text)) {
    dna.leadTime = dnaField("加急", "identified", 0.9, "text_extraction");
  }

  // 防水
  if (/防水|防泼水|抗水/i.test(text)) {
    dna.waterproof = dnaField("防水要求高", "inferred", 0.5, "text_extraction");
  }

  // 涂层
  const coatingMatch = text.match(/(PU|PA|PVC|TPU)\s*涂层/i);
  if (coatingMatch) {
    dna.coating = dnaField(coatingMatch[0], "identified", 0.9, "text_extraction");
  }

  // 阻燃
  if (/阻燃|防火/i.test(text)) {
    dna.features = dnaField("阻燃", "inferred", 0.5, "text_extraction");
  }

  // 上下文推断（低置信度）
  if (/210d|牛津|尼龙|涤纶|春亚纺|涤塔夫/i.test(text)) {
    dna.composition = dnaField("涤纶", "inferred", 0.4, "inference");
    dna.weave = dnaField("牛津", "inferred", 0.5, "inference");
  }

  // 从图片推断（如果有图片）
  if (images.length > 0) {
    dna.color = dnaField("参考图片", "inferred", 0.3, "image_analysis");
  }

  return dna;
}

// ===== 分类规则 =====

function inferCategory(text: string): string {
  const categoryRules = [
    { category: "窗帘布", patterns: ["窗帘", "遮光"] },
    { category: "箱包布", patterns: ["箱包", "包袋", "行李箱", "背包"] },
    { category: "帐篷布", patterns: ["帐篷", "天幕", "露营"] },
    { category: "户外功能面料", patterns: ["户外", "防水", "耐磨"] },
    { category: "服装面料", patterns: ["服装", "衣服", "外套", "裤子"] },
    { category: "家纺布", patterns: ["家纺", "床品", "沙发"] },
    { category: "牛津布", patterns: ["牛津��", "Oxford"] }
  ];
  return (
    categoryRules.find((rule) =>
      rule.patterns.some((p) => text.toLowerCase().includes(p.toLowerCase()))
    )?.category || "其他面料"
  );
}

function inferFabricName(text: string, category: string): string {
  const match = text.match(/(\d{2,4}[DdTt][\u4e00-\u9fa5A-Za-z]*)/i);
  return match?.[1] || category;
}

// ===== 规格提取 =====

function extractSpecs(text: string): string {
  const specs = [
    text.match(/\d{2,4}D/i)?.[0],
    text.match(/\d{2,4}\s*(?:gsm|克)/i)?.[0],
    text.match(/\d{2,3}\s*(?:cm|CM|厘米)/)?.[0],
    text.includes("防水") ? "防水" : "",
    text.includes("耐磨") ? "耐磨" : "",
    text.includes("阻燃") ? "阻燃" : ""
  ].filter(Boolean);
  return specs.join(" / ");
}

function extractQuantity(text: string): string {
  return (
    text.match(/\d+\s*(?:米|码|kg|公斤|吨|卷)/i)?.[0] ||
    text.match(/MOQ\s*[:：]?\s*\d+/i)?.[0] ||
    ""
  );
}

function extractMarket(text: string): string {
  const markets = ["韩国", "日本", "美国", "欧洲", "中东", "东南亚"];
  return markets.find((m) => text.includes(m)) || "";
}

function deriveUrgency(dna: FabricDNA): string {
  const lt = dna.leadTime.value;
  if (/急|3天|当[天日]/.test(lt)) return "加急";
  if (lt) return lt;
  return "";
}

// ===== 缺失字段 + 关键词 =====

function inferMissingFields(text: string): string[] {
  const fields = [
    { label: "数量/MOQ", pattern: /\d+\s*(?:米|码|kg|公斤|吨|卷)|MOQ/i },
    { label: "克重", pattern: /\d{2,4}\s*(?:gsm|克)/i },
    { label: "幅宽", pattern: /\d{2,3}\s*(?:cm|CM|厘米)/ },
    { label: "用途", pattern: /用途|用于|酒店|箱包|帐篷|窗帘|服装|家纺/ }
  ];
  return fields.filter((f) => !f.pattern.test(text)).map((f) => f.label);
}

function buildKeywords(text: string, category: string): string[] {
  return Array.from(
    new Set([
      category,
      inferFabricName(text, category),
      extractMarket(text),
      "面料采购",
      "现货面料"
    ].filter(Boolean))
  );
}

// ===== Evidence 构建 =====

function createDefaultEvidence(text: string, images: ImagePayload[]): DemandEvidence {
  const hasImages = images.length > 0;
  const confirmed = confirmedEvidenceFromText(text);
  const confirmedLabels = new Set(confirmed.map((item) => item.split("：")[0]));
  const unknown = hiddenParameterLabels.filter((label) => !confirmedLabels.has(label));

  return {
    observed: hasImages
      ? [
          "图片识别：可观察颜色、纹理、表面光泽和大致组织。",
          "图片不能可靠判断丹尼数、克重、幅宽、成分、涂层、水压和 MOQ。"
        ]
      : [],
    inferred:
      hasImages
        ? ["AI推测，待确认：图片可见特征需采购方确认。"]
        : [],
    confirmed,
    unknown,
    followUpQuestions: buildDefaultFollowUpQuestions(text, unknown)
  };
}

function confirmedEvidenceFromText(text: string): string[] {
  const confirmed: string[] = [];
  const normalized = text.toLowerCase();

  if (/\d{2,4}\s*d/i.test(text)) confirmed.push(`丹尼数：${text.match(/\d{2,4}\s*d/i)?.[0]}`);
  if (/\d{2,4}\s*(gsm|克|g\/m2|g\/㎡)/i.test(text)) confirmed.push(`克重：${text.match(/\d{2,4}\s*(gsm|克|g\/m2|g\/㎡)/i)?.[0]}`);
  if (/\d{2,3}\s*(cm|厘米|公分)/i.test(text) || text.includes("幅宽")) confirmed.push("幅宽：用户文字已提供");
  if (/(涤纶|尼龙|锦纶|棉|聚酯|polyester|nylon|成分)/i.test(text)) confirmed.push("成分：用户文字已提供");
  if (/(涂层|覆膜|pu|pvc|tpu|pa)/i.test(normalized)) confirmed.push("涂层：用户文字已提供");
  if (/(水压|防水等级|mmh2o|mm h2o)/i.test(normalized)) confirmed.push("水压：用户文字已提供");
  if (/(moq|起订|起定|\d+\s*(米|码|kg|公斤|吨|卷))/i.test(text)) confirmed.push("MOQ：用户文字已提供");

  return confirmed;
}

function buildDefaultFollowUpQuestions(_text: string, unknown: string[]): string[] {
  const questions = [
    "这块布最终用于什么产品或场景？",
    "需要偏薄、偏厚、柔软还是挺括？",
    unknown.includes("涂层") ? "是否需要 PU/PVC/TPU 等涂层或特殊后整理？" : "",
    unknown.length > 0 ? "是否已有丹尼数、克重、幅宽、成分、水压或 MOQ 等规格？" : ""
  ].filter(Boolean);
  return Array.from(new Set(questions)).slice(0, 4);
}

// ===== 安全兜底 =====

function applySafetyRules(result: DemandResult, text: string, images: ImagePayload[]): void {
  const confirmed = confirmedEvidenceFromText(text);
  const confirmedLabels = new Set(confirmed.map((item) => item.split("：")[0]));
  const unknown = Array.from(
    new Set([
      ...result.evidence.unknown,
      ...hiddenParameterLabels.filter((label) => !confirmedLabels.has(label))
    ])
  );

  result.evidence = {
    ...result.evidence,
    confirmed: confirmed.length > 0 ? confirmed : result.evidence.confirmed,
    unknown
  };
  result.missingFields = Array.from(
    new Set([...result.missingFields, ...unknown.filter((l) => l !== "MOQ")])
  );
}
