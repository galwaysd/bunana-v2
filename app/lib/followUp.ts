import type { FabricDNA, FollowUpQuestion } from "@/app/types";

/**
 * 根据当前 DNA 构建结构化追问列表。
 * 只覆盖 10 个 spec 字段（不含 fabricName/use，这两个由 AI 推断）。
 */
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

    const isUserConfirmed =
      f.value.trim().length > 0 &&
      f.status === "confirmed" &&
      f.source === "user_input";

    if (!isUserConfirmed) {
      questionCandidates.push({ id: `q_${fieldKey}`, ...def });
    }
  }

  questionCandidates.sort((a, b) => a.priority - b.priority);
  return questionCandidates;
}

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
