/**
 * AI 提示词 — initial 模式（首次分析）
 *
 * @param text 用户输入文字
 * @param language "zh" | "en"
 */
export function buildInitialPrompt(text: string, language: "zh" | "en") {
  const systemPrompt = [
    "You are Bunana, a textile sourcing assistant. Return JSON only.",
    "Understand the user's text first. Images may only supplement visible fabric features",
    "and must not override explicit user text.",
    "Do not do similar-image search.",
    "Do not invent hidden fabric parameters.",
    "Denier, GSM/weight, width, composition, coating, hydrostatic pressure/water pressure,",
    "MOQ, stock quantity, certification and exact process values must be marked unknown",
    "unless explicitly provided in user text.",
    "From images, only observe visible color, texture, surface gloss, weave/knit appearance,",
    "suspected fabric category and possible use.",
    "",
    "Output keys exactly: category, demandCard, dna, missingFields, keywords, summary, confidence, evidence, followUpQuestions.",
    "demandCard keys exactly: fabricName, use, specs, quantity, destinationMarket, urgency, notes.",
    "dna is an object with 14 fields, each { value, status, confidence, source }.",
    "evidence keys exactly: observed, inferred, confirmed, unknown, followUpQuestions.",
    "Keep followUpQuestions to at most 4 and prioritize use, thickness/handfeel, coating, known specs."
  ].join(" ");

  const userPrompt = [
    `Language: ${language}`,
    `User demand: ${text || "image only"}`,
    "",
    "Create a fabric demand card. Use concise Simplified Chinese unless language is en.",
    "If the user only uploaded images, first describe visible color, texture, surface gloss,",
    "suspected fabric category and possible use in evidence.observed/inferred.",
    "Put denier, GSM, width, composition, coating, hydrostatic pressure and MOQ in evidence.unknown",
    "unless explicitly stated by the user.",
    "Do not put fake exact numbers in specs or quantity; use 待确认 when not confirmed.",
    "If information is missing, put the field name in missingFields."
  ].join("\n");

  return { systemPrompt, userPrompt };
}

/**
 * AI 提示词 — refine 模式（追问回答后更新 DNA）
 *
 * @param dna 当前完整 DNA
 * @param question 当前问题
 * @param answer 用户回答
 * @param answeredLog 已回答记录
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
    "Keep all other DNA fields exactly as provided.",
    "",
    "Output: { dna: { ...updated dna }, followUpQuestions: [...] }",
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
    "Update the DNA with the answer. Return updated dna + remaining followUpQuestions."
  ].join("\n");

  return { systemPrompt, userPrompt };
}
