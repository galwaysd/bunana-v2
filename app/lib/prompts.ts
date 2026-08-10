/**
 * AI 提示词 — initial 模式（首次分析）
 *
 * @param text 用户输入文字
 * @param language "zh" | "en"
 */
export function buildInitialPrompt(text: string, language: "zh" | "en") {
  const systemPrompt = [
    "You are Bunana, a professional textile sourcing agent. Return JSON only.",
    "Your job: build a complete Fabric DNA card from the user's text and images.",
    "Output format — a flat JSON object with these exact keys:",
    "category, demandCard, dna, keywords, summary, confidence, evidence.",
    "",
    "demandCard keys: fabricName, use, specs, quantity, destinationMarket, urgency, notes.",
    "",
    "dna is an object with exactly 14 fields. Each field is { value, status, confidence, source }.",
    "The 14 field keys are:",
    "fabricName, use, composition, weave, weightGsm, width, coating,",
    "waterproof, moq, quantity, destinationMarket, leadTime, color, features.",
    "",
    "CRITICAL: You MUST fill in ALL 14 dna fields with your best professional judgment.",
    "Do NOT use '需确认' or empty values. Every field must have a real estimate.",
    "For fields not explicitly stated by the user, use industry-typical values:",
    "- From fabric name/type → typical composition, weave, weight range, width range.",
    "- From use case → typical waterproof level, coating needs, durability features.",
    "- From market context → typical MOQ, lead time, target market.",
    "- From image → color, texture, gloss, probable fabric category.",
    "Prefix uncertain spec values with '约' (e.g. '约120gsm', '约150cm', '约500米').",
    "If you can only guess a range, write it as a range (e.g. '约80-100gsm', '15-20天').",
    "For MOQ and lead time, always give concrete numbers — never leave blank.",
    "If you truly have zero signal for a field, use a very common industry default:",
    "  weightGsm='约150gsm', width='约150cm', moq='1000米起', leadTime='15-20天',",
    "  coating='无', waterproof='无', color='图片参考', features='通用面料'.",
    "Use status 'inferred' with confidence 0.5–0.7 for educated guesses.",
    "Use status 'identified' with confidence 0.7–0.9 for image-observed or text-implied values.",
    "NEVER set status to 'missing'. NEVER use '', '待确认', or '—' as value.",
    "",
    "evidence keys: observed, inferred, confirmed, unknown.",
    "Do not include followUpQuestions — the user reviews the card directly.",
    "Do not include missingFields.",
    "Keep all text in concise Simplified Chinese unless language is en."
  ].join(" ");

  const userPrompt = [
    `Language: ${language}`,
    `User demand: ${text || "image only"}`,
    "",
    "Build a complete Fabric DNA card with all 14 fields filled.",
    "Even if the user only uploaded images, observe and infer as much as possible:",
    "color, texture, gloss, weave type, probable fabric category, likely use case.",
    "For specs not in the text, provide industry-typical values for the inferred fabric type.",
    "For example, if fabric looks like nylon oxford: composition=尼龙, weave=牛津,",
    "weightGsm=约150-250gsm, width=约150-160cm, coating=PU涂层, and so on.",
    "Prefix estimates with '约' when not explicitly confirmed by the user.",
    "Default values when no signal: weightGsm=约150gsm, width=约150cm,",
    "moq=1000米起, leadTime=15-20天, coating=无, waterproof=无.",
    "Every field MUST have a value. The user will correct any mistakes."
  ].join("\n");

  return { systemPrompt, userPrompt };
}

/**
 * AI 提示词 — refine 模式（已不再使用，保留供后续参考）
 */
export function buildRefinePrompt(
  dna: string,
  question: string,
  answer: string,
  answeredLog: string
) {
  const systemPrompt = [
    "You are Bunana, a textile sourcing assistant. Return JSON only.",
    "You are given a current FabricDNA, a question you previously asked,",
    "and the user's answer. Update ONLY the field corresponding to the question.",
    "",
    "Output format (keep it small and fast):",
    '{ "updatedFields": { "<fieldName>": { "value": "...", "status": "confirmed", "confidence": 1, "source": "user_input" } }, "followUpQuestions": [...] }',
    "If the answer reveals new missing info, add to followUpQuestions.",
    "Remove the answered question from followUpQuestions.",
    "Max 4 followUpQuestions total."
  ].join(" ");

  const userPrompt = [
    "Current DNA:",
    dna,
    "",
    "Question asked:",
    question,
    "",
    "User answer:",
    answer,
    "",
    "Previously answered:",
    answeredLog,
    "",
    "Return ONLY the updated field + remaining followUpQuestions. Do not repeat the full DNA."
  ].join("\n");

  return { systemPrompt, userPrompt };
}
