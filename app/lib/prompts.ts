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
    "CRITICAL: You MUST return ALL 14 dna field objects, but values may be empty when evidence is unavailable.",
    "For a field without reliable image evidence or explicit user text, return:",
    '{ "value": "", "status": "missing", "confidence": 0, "source": "inference" }.',
    "Do not invent industry defaults or concrete business values to fill missing information.",
    "For fields supported by evidence:",
    "- From fabric name/type → probable composition and weave.",
    "- From use case → typical waterproof level, coating needs, durability features.",
    "- From image → color, texture, gloss, probable fabric category.",
    "weightGsm, width, moq, quantity, destinationMarket, and leadTime require explicit user text or user confirmation; images alone cannot establish them.",
    "When the user explicitly provides any of those fields, copy the stated value into the matching DNA field and use source 'text_extraction'.",
    "Use status 'inferred' with confidence 0.5–0.7 for educated guesses.",
    "Use status 'identified' with confidence 0.7–0.9 for image-observed or text-implied values.",
    "Use status 'missing' and an empty value when evidence is unavailable. Do not use display placeholders such as '待确认' or '—' as data values.",
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
    "Build a Fabric DNA card containing all 14 field objects.",
    "Even if the user only uploaded images, observe and infer as much as possible:",
    "color, texture, gloss, weave type, probable fabric category, likely use case.",
    "Do not infer weightGsm, width, moq, quantity, destinationMarket, or leadTime from images or industry conventions.",
    "Copy any explicitly stated values for those fields from User demand into the matching DNA fields.",
    "If those fields are not explicitly present in the user's text, return an empty missing field object.",
    "Other fields may be identified or inferred only when the image or text provides reasonable evidence."
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
