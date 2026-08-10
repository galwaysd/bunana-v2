// ===== 基础 =====

export type ImagePayload = {
  name: string;
  dataUrl: string;
  imageHash: string;
};

// ===== FabricDNA 字段系统 =====

export type FieldStatus = "identified" | "inferred" | "confirmed" | "missing";
export type FieldSource = "image_analysis" | "text_extraction" | "inference" | "user_input";

export type FabricField = {
  value: string;
  status: FieldStatus;
  confidence: number; // 0~1
  source: FieldSource;
};

export type FabricDNA = {
  fabricName: FabricField;
  use: FabricField;
  composition: FabricField;
  weave: FabricField;
  weightGsm: FabricField;
  width: FabricField;
  coating: FabricField;
  waterproof: FabricField;
  moq: FabricField;
  quantity: FabricField;
  destinationMarket: FabricField;
  leadTime: FabricField;
  color: FabricField;
  features: FabricField;
};

// ===== DemandCard =====

export type DemandCard = {
  fabricName: string;
  use: string;
  specs: string;
  quantity: string;
  destinationMarket: string;
  urgency: string;
  notes: string;
};

// ===== Evidence =====

export type DemandEvidence = {
  observed: string[];
  inferred: string[];
  confirmed: string[];
  unknown: string[];
  followUpQuestions: string[];
};

// ===== FollowUpQuestion =====

export type FollowUpQuestion = {
  id: string;
  field: keyof FabricDNA;
  question: string;
  options: string[];
};

// ===== API 请求/响应 =====

export type BunanaAnalyzeRequest = {
  mode: "initial" | "refine";
  text?: string;
  images?: ImagePayload[];
  // refine 模式专用
  currentDNA?: FabricDNA;
  question?: FollowUpQuestion;
  answer?: string;
  answeredLog?: Record<string, string>;
};

export type AnalyzeResponse = {
  success: boolean;
  error?: string;
  aiProvider?: "zhipu" | "dify";
  dna?: FabricDNA;
  demandCard?: DemandCard;
  followUpQuestions?: FollowUpQuestion[];
  missingFields?: string[];
  keywords?: string[];
  summary?: string;
  confidence?: number;
  evidence?: DemandEvidence;
};

// ===== 广场（节点 F） =====

export type RequirementRecord = {
  id: string;
  text: string;
  category: string;
  demandCard: DemandCard;
  missingFields: string[];
  keywords: string[];
  summary: string;
  confidence: number;
  imageIds: string[];
  images: Array<{
    id: string;
    url: string;
    originalName?: string;
    reused?: boolean;
  }>;
  createdAt: string;
};

export type PublishResponse = {
  success: boolean;
  error?: string;
  requirement?: RequirementRecord;
};

export type RequirementsResponse = {
  success: boolean;
  requirements: RequirementRecord[];
};

// ===== AI 内部 =====

export type DemandResult = {
  category: string;
  dna: FabricDNA;
  demandCard: DemandCard;
  missingFields: string[];
  keywords: string[];
  summary: string;
  confidence: number;
  evidence: DemandEvidence;
  followUpQuestions: FollowUpQuestion[];
};

export type SavedImageAsset = {
  id: string;
  hash: string;
  url: string;
  path: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  dataUrl?: string;
  reused: boolean;
  createdAt: string;
};
