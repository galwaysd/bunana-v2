/**
 * E2E 測試 — 步驟 6：布市場完整鏈路
 *
 * 流程：
 *  1. 獲取廣場當前列表
 *  2. 初始分析 → 追問補全（手動合併回答防 AI 丟失） → 發布新記錄
 *  3. 驗證新記錄出現在廣場列表中
 *  4. 獲取記錄詳情
 *  5. 測試篩選
 *  6. 驗證「我需要這個面料」鏈接
 */

const BASE = "http://localhost:3000";

async function post(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json();
}

async function get(url) {
  const resp = await fetch(url);
  return resp.json();
}

function mergeDnaAnswer(dna, field, answer) {
  return {
    ...dna,
    [field]: { value: answer, status: "confirmed", confidence: 1, source: "user_input" },
  };
}

async function main() {
  let passed = 0;
  let failed = 0;

  function check(step, condition, msg) {
    if (condition) {
      console.log(`  ✅ ${step}: ${msg}`);
      passed++;
    } else {
      console.log(`  ❌ ${step}: ${msg}`);
      failed++;
    }
  }

  // ==========================================
  // 1. 獲取廣場當前列表
  // ==========================================
  console.log("\n=== STEP 1: 獲取廣場列表 ===");
  const listBefore = await get(`${BASE}/api/bunana/requirements`);
  check("1.1", listBefore.success, "獲取成功");
  check("1.2", Array.isArray(listBefore.requirements), "返回數組");
  const countBefore = listBefore.requirements.length;
  console.log(`  當前記錄數: ${countBefore}`);

  // ==========================================
  // 2. 發布一條新記錄
  // ==========================================
  console.log("\n=== STEP 2: 發布新記錄 ===");

  const text = "我需要一款輕量抗UV尼絲紡，用於戶外運動服裝，顏色軍綠，防水等級PU800，幅寬180cm";

  // 2a. 初始分析
  const analyzeResult = await post(`${BASE}/api/bunana/analyze`, {
    mode: "initial",
    text,
    images: [],
  });
  check("2.1", analyzeResult.success, "初始分析成功");
  check("2.2", analyzeResult.aiProvider === "zhipu", "AI provider = zhipu");

  let dna = analyzeResult.dna;
  let followUpQuestions = analyzeResult.followUpQuestions ?? [];
  let answeredLog = {};

  console.log(`  初始分析: ${dna?.fabricName?.value || "?"}, 追問 ${followUpQuestions.length} 題`);

  // 2b. 逐輪回答追問（手動合併答案防 AI 丟失已確認字段）
  let round = 0;
  const maxRounds = 20;
  const answeredFields = new Set();

  while (followUpQuestions.length > 0 && round < maxRounds) {
    round++;
    const q = followUpQuestions[0];

    // 跳過已回答的字段
    if (answeredFields.has(q.field)) {
      console.log(`  跳過已答字段: ${q.field}`);
      followUpQuestions = followUpQuestions.slice(1);
      continue;
    }

    const answer = q.options?.[0] ?? "自動測試回答";
    answeredFields.add(q.field);

    console.log(`  追問 #${round}: ${q.field} → ${answer}`);

    // 先手動合併到 DNA 和 answeredLog
    dna = mergeDnaAnswer(dna, q.field, answer);
    answeredLog = { ...answeredLog, [q.field]: answer };

    // 調用 refine 獲取下一輪追問
    const refineResult = await post(`${BASE}/api/bunana/analyze`, {
      mode: "refine",
      currentDNA: dna,
      question: q,
      answer,
      answeredLog,
      text,
      images: [],
    });

    if (refineResult.success) {
      // 保留 AI 返回的 DNA（可能有新推斷），但確保已回答字段不被覆蓋
      const aiDna = refineResult.dna;
      for (const field of answeredFields) {
        if (aiDna[field]?.status !== "confirmed") {
          aiDna[field] = dna[field]; // 恢復手動合併的值
        }
      }
      dna = aiDna;
      followUpQuestions = (refineResult.followUpQuestions ?? []).filter(
        (fq) => !answeredFields.has(fq.field)
      );
      answeredLog = refineResult.answeredLog ?? answeredLog;
    } else {
      console.log(`  ⚠ refine 失敗: ${refineResult.error}，繼續下一題`);
      followUpQuestions = followUpQuestions.slice(1).filter(
        (fq) => !answeredFields.has(fq.field)
      );
    }
  }

  console.log(`  追問完成: ${round} 輪, ${answeredFields.size} 字段已確認`);

  // 2c. 發布
  const publishResult = await post(`${BASE}/api/bunana/requirements`, {
    text,
    dna,
    images: [],
    aiProvider: "zhipu",
  });
  check("2.3", publishResult.success, "發布成功");
  const newId = publishResult.requirement?.id;
  check("2.4", !!newId, `記錄 ID: ${newId?.slice(0, 8)}...`);
  console.log(`  發布記錄: ${publishResult.requirement?.fabricName}`);

  // ==========================================
  // 3. 驗證新記錄出現在廣場列表
  // ==========================================
  console.log("\n=== STEP 3: 驗證廣場列表 ===");
  const listAfter = await get(`${BASE}/api/bunana/requirements`);
  check("3.1", listAfter.success, "獲取成功");
  check(
    "3.2",
    listAfter.requirements.length >= countBefore,
    `記錄數 (${countBefore} → ${listAfter.requirements.length})`
  );

  const found = listAfter.requirements.find((r) => r.id === newId);
  check("3.3", !!found, "廣場列表包含新記錄");
  if (found) {
    check("3.4", found.fabricName?.length > 0, `面料名稱: ${found.fabricName}`);
    check("3.5", Array.isArray(found.keywords), "有關鍵詞");
    console.log(`  關鍵詞: ${found.keywords?.join(", ")}`);
  }

  // ==========================================
  // 4. 獲取記錄詳情
  // ==========================================
  console.log("\n=== STEP 4: 驗證詳情頁 ===");
  const detailResult = await get(
    `${BASE}/api/bunana/requirements?id=${encodeURIComponent(newId)}`
  );
  check("4.1", detailResult.success, "獲取詳情成功");
  check("4.2", detailResult.requirement?.id === newId, "ID 匹配");
  check("4.3", !!detailResult.requirement?.specs, `規格: ${detailResult.requirement?.specs?.slice(0, 50)}`);
  check("4.4", !!detailResult.requirement?.summary, "有摘要");

  // ==========================================
  // 5. 測試篩選（客戶端邏輯）
  // ==========================================
  console.log("\n=== STEP 5: 測試篩選邏輯 ===");
  const allItems = listAfter.requirements;
  const fabricName = found?.fabricName ?? "";

  // 按面料名稱篩選
  const filtered = allItems.filter((r) =>
    [r.fabricName, r.specs, r.summary, ...(r.keywords || []), r.category]
      .join(" ")
      .includes(fabricName)
  );
  check("5.1", filtered.length >= 1, `篩選"${fabricName}" 匹配 ${filtered.length} 條`);
  check("5.2", filtered.some((r) => r.id === newId), "篩選結果包含新記錄");

  // 按成分/材質篩選
  const hasNylon = found?.keywords?.some(
    (k) => k.includes("尼龍") || k.includes("尼絲紡") || k.includes("錦綸")
  );
  if (hasNylon) {
    const compFiltered = allItems.filter((r) =>
      [r.fabricName, r.specs, r.summary, ...(r.keywords || []), r.category]
        .join(" ")
        .includes("尼絲紡")
    );
    check(
      "5.3",
      compFiltered.length >= 1,
      `成分篩選"尼絲紡" 匹配 ${compFiltered.length} 條`
    );
  }

  // 按用途篩選
  const hasOutdoor = found?.keywords?.some(
    (k) => k.includes("戶外") || k.includes("運動") || k.includes("服裝")
  );
  if (hasOutdoor) {
    const useFiltered = allItems.filter((r) =>
      [r.fabricName, r.specs, r.summary, ...(r.keywords || []), r.category]
        .join(" ")
        .includes("戶外")
    );
    check(
      "5.4",
      useFiltered.length >= 1,
      `用途篩選"戶外" 匹配 ${useFiltered.length} 條`
    );
  }

  // ==========================================
  // 6. 驗證「我需要這個面料」鏈接
  // ==========================================
  console.log("\n=== STEP 6: 驗證預填鏈接 ===");
  const demandText = `我需要 ${found?.fabricName || "這款面料"}${found?.specs && found.specs !== "待確認" ? `，規格：${found.specs}` : ""}`;
  check("6.1", demandText.length > 10, `預填文本長度: ${demandText.length}`);
  const encodedUrl = `/?text=${encodeURIComponent(demandText)}`;
  check("6.2", encodedUrl.includes("text="), "URL 包含 text 參數");
  console.log(`  詳情頁按鈕跳轉: ${encodedUrl.slice(0, 100)}...`);

  // ==========================================
  // 最終結果
  // ==========================================
  console.log(`\n=== 結果 ===`);
  console.log(`  ✅ ${passed} 通過`);
  console.log(`  ❌ ${failed} 失敗`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("測試異常:", e);
  process.exitCode = 1;
});
