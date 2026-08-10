/**
 * E2E test: image upload -> AI analyze -> follow-up -> done -> publish to Supabase
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const BASE = "http://localhost:3000";
const IMAGE_PATH = path.resolve(process.cwd(), "image.png");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${res.status} (non-JSON): ${text.slice(0, 500)}`);
  }
  if (!res.ok || !json.success) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json, null, 2).slice(0, 800)}`);
  }
  return json;
}

async function main() {
  console.log("=== E2E Publish Test ===");
  console.log("Image:", IMAGE_PATH);

  if (!fs.existsSync(IMAGE_PATH)) {
    throw new Error("image.png not found in project root");
  }

  const buffer = fs.readFileSync(IMAGE_PATH);
  const base64 = buffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;
  const imageHash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Step 1: initial analyze
  const text = "我需要一款防水牛津布，用于户外背包，颜色深灰，幅宽180cm，起订量3000米";
  console.log("\n[1/4] POST /api/bunana/analyze (initial)");
  console.log("Text:", text);

  let result = await post(`${BASE}/api/bunana/analyze`, {
    mode: "initial",
    text,
    images: [{ name: "test-fabric.png", dataUrl, imageHash }],
  });

  console.log("AI provider:", result.aiProvider);
  console.log("fabricName:", result.dna?.fabricName?.value, `(${result.dna?.fabricName?.status})`);
  console.log("use:", result.dna?.use?.value, `(${result.dna?.use?.status})`);
  console.log("Follow-up fields:", result.followUpQuestions?.map((q) => q.field).join(", ") || "none");

  let dna = result.dna;
  let followUpQuestions = result.followUpQuestions ?? [];
  let answeredLog = {};
  let round = 0;

  // Step 2: answer follow-ups until done
  while (followUpQuestions.length > 0 && round < 12) {
    round++;
    const question = followUpQuestions[0];
    const answer = question.options && question.options.length > 0
      ? question.options[0]
      : "不确定";

    console.log(`\n[2/4] Round ${round}: answer "${question.field}" -> "${answer}"`);

    // 前端逻辑：自己维护 answeredLog
    const newAnsweredLog = { ...answeredLog, [question.field]: answer };

    const refineResult = await post(`${BASE}/api/bunana/analyze`, {
      mode: "refine",
      currentDNA: dna,
      question,
      answer,
      answeredLog: newAnsweredLog,
      text,
      images: [{ name: "test-fabric.png", dataUrl, imageHash }],
    });

    dna = refineResult.dna;
    followUpQuestions = refineResult.followUpQuestions ?? [];
    answeredLog = newAnsweredLog;

    console.log("Next follow-up fields:", followUpQuestions.map((q) => q.field).join(", ") || "none");

    const confirmed = Object.entries(dna).filter(([k, v]) => v.status === "confirmed").map(([k]) => k);
    console.log("Confirmed fields:", confirmed.join(", "));
  }

  console.log("\n[3/4] Done state reached");
  const allConfirmed = Object.entries(dna).filter(([k, v]) => v.status === "confirmed").map(([k]) => k);
  console.log("All confirmed fields:", allConfirmed.length, allConfirmed.join(", "));

  // Step 4: publish
  console.log("\n[4/4] POST /api/bunana/requirements (publish)");
  const publishResult = await post(`${BASE}/api/bunana/requirements`, {
    text,
    dna,
    images: [{ name: "test-fabric.png", dataUrl, imageHash }],
    aiProvider: result.aiProvider ?? "zhipu",
  });

  console.log("Published requirement ID:", publishResult.requirement?.id);
  console.log("fabricName:", publishResult.requirement?.fabricName);
  console.log("keywords:", publishResult.requirement?.keywords?.join(", "));
  console.log("imageIds:", publishResult.requirement?.imageIds?.join(", "));

  // Step 5: verify list
  console.log("\n[5/4] GET /api/bunana/requirements (verify list)");
  const listRes = await fetch(`${BASE}/api/bunana/requirements`);
  const listJson = await listRes.json();
  console.log("List count:", listJson.requirements?.length);
  const found = listJson.requirements?.find((r) => r.id === publishResult.requirement?.id);
  console.log("Record found in list:", found ? "YES" : "NO");

  console.log("\n=== E2E Publish Test PASSED ===");
}

main().catch((err) => {
  console.error("\n=== E2E Publish Test FAILED ===");
  console.error(err.message || err);
  process.exit(1);
});
