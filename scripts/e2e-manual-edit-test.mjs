/**
 * E2E test: 验证面料名称 / 用途可手动编辑后正确发布
 *
 * 本测试模拟前端手动编辑行为：在 initial analyze 后，
 * 客户端直接修改 dna.fabricName / dna.use 为 confirmed/user_input，
 * 再调用发布接口，验证记录中保存的是手动输入的值。
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const BASE = "http://localhost:3000";
const IMAGE_PATH = path.resolve(process.cwd(), "image.png");

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
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
  console.log("=== E2E Manual Edit Test ===");

  if (!fs.existsSync(IMAGE_PATH)) {
    throw new Error("image.png not found in project root");
  }

  const buffer = fs.readFileSync(IMAGE_PATH);
  const base64 = buffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;
  const imageHash = crypto.createHash("sha256").update(buffer).digest("hex");

  const text = "找一款面料，具体要求后续再确认";
  console.log("\n[1/3] POST /api/bunana/analyze (initial)");
  const result = await post(`${BASE}/api/bunana/analyze`, {
    mode: "initial",
    text,
    images: [{ name: "test-fabric.png", dataUrl, imageHash }]
  });

  let dna = result.dna;
  console.log("Initial fabricName:", dna.fabricName.value, `(${dna.fabricName.status})`);
  console.log("Initial use:", dna.use.value, `(${dna.use.status})`);

  // Simulate front-end manual edit
  const manualFabricName = "210D 尼龙牛津布";
  const manualUse = "户外背包 / 登山包主面料";

  dna = {
    ...dna,
    fabricName: { value: manualFabricName, status: "confirmed", confidence: 1, source: "user_input" },
    use: { value: manualUse, status: "confirmed", confidence: 1, source: "user_input" }
  };

  console.log("\n[2/3] Manual edit applied:");
  console.log("fabricName ->", manualFabricName);
  console.log("use ->", manualUse);

  console.log("\n[3/3] POST /api/bunana/requirements (publish)");
  const publishResult = await post(`${BASE}/api/bunana/requirements`, {
    text,
    dna,
    images: [{ name: "test-fabric.png", dataUrl, imageHash }],
    aiProvider: result.aiProvider ?? "zhipu"
  });

  const published = publishResult.requirement;
  console.log("Published requirement ID:", published?.id);
  console.log("Published fabricName:", published?.fabricName);
  console.log("Published keywords:", published?.keywords?.join(", "));

  if (published?.fabricName !== manualFabricName) {
    throw new Error(`fabricName mismatch: expected "${manualFabricName}", got "${published?.fabricName}"`);
  }
  if (!published?.keywords?.includes(manualFabricName)) {
    throw new Error("keywords 应包含手动输入的面料名称");
  }
  if (!published?.keywords?.includes(manualUse)) {
    throw new Error("keywords 应包含手动输入的用途");
  }

  // Verify single-record read
  const getRes = await fetch(`${BASE}/api/bunana/requirements?id=${published.id}`);
  const getJson = await getRes.json();
  if (getJson.requirement?.fabricName !== manualFabricName) {
    throw new Error("单条查询返回的 fabricName 与手动编辑值不一致");
  }
  console.log("Single-record read verified.");

  console.log("\n=== E2E Manual Edit Test PASSED ===");
}

main().catch((err) => {
  console.error("\n=== E2E Manual Edit Test FAILED ===");
  console.error(err.message || err);
  process.exit(1);
});
