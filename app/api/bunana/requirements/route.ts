/**
 * POST /api/bunana/requirements — 发布需求到广场（需认证）
 * GET  /api/bunana/requirements — 获取广场列表（公开）
 *
 * V2 不做登录，所有记录 user_id = null。
 * 写操作需要 x-bunana-api-secret 认证头。
 */
import { NextRequest, NextResponse } from "next/server";
import { insertRequirement, listRequirements, getRequirementById } from "@/app/lib/supabase/requirements";
import type { PostType } from "@/app/lib/supabase/requirements";
import { persistImageFromDataUrl } from "@/app/lib/supabase/images";
import type { ImagePayload, FabricDNA } from "@/app/types";
import { buildSpecsFromDNA } from "@/app/lib/dna";
import { validateApiSecret, secureCorsHeaders } from "@/app/lib/auth";

// ===== POST: 发布需求（需认证） =====

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  // === 安全层: API 密钥认证 ===
  if (!validateApiSecret(request)) {
    return NextResponse.json(
      { success: false, error: "未授权的请求。" },
      { status: 401, headers: secureCorsHeaders(origin) }
    );
  }

  try {
    const body = await request.json();

    const text: string = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ success: false, error: "需求文本不能为空。" }, { status: 400, headers: secureCorsHeaders(origin) });
    }

    // post_type: 必填，只能是 seeking（找布）/ offering（有布）
    const postTypeRaw = body.postType ?? body.post_type;
    const postType: PostType = postTypeRaw === "offering" ? "offering" : "seeking";

    const dna: FabricDNA | undefined = body.dna;
    if (!dna) {
      return NextResponse.json({ success: false, error: "缺少 Fabric DNA。" }, { status: 400, headers: secureCorsHeaders(origin) });
    }

    const images: ImagePayload[] = Array.isArray(body.images) ? body.images : [];
    const aiProvider: string = body.aiProvider ?? "zhipu";

    // 图片大小校验：单张 base64 不超过 10MB
    for (let i = 0; i < images.length; i++) {
      if (images[i].dataUrl && images[i].dataUrl.length > 14_000_000) {
        return NextResponse.json(
          { success: false, error: `第 ${i + 1} 张图片过大，请压缩后重试。` },
          { status: 400, headers: secureCorsHeaders(origin) }
        );
      }
    }

    const fabricName = dna.fabricName?.value || "未命名面料";
    const specs = buildSpecsFromDNA(dna);

    const keywords: string[] = [];
    if (fabricName) keywords.push(fabricName);
    if (dna.use?.value) keywords.push(dna.use.value);
    if (dna.composition?.value) keywords.push(dna.composition.value);

    // 1. 持久化图片（SHA-256 去重）
    const imageAssets = await Promise.all(
      images.map((img) =>
        persistImageFromDataUrl(img.dataUrl, img.imageHash, img.name)
      )
    );

    // 2. 写入需求
    const requirement = await insertRequirement({
      text,
      category: fabricName,
      fabricName,
      specs,
      postType,
      keywords: [...new Set(keywords)].filter(Boolean).slice(0, 10),
      summary: (() => {
        const parts = ["Fabric DNA 已构建完成。"];
        if (dna.composition?.value) parts.push(`成分：${dna.composition.value}。`);
        if (dna.weightGsm?.value) parts.push(`克重：${dna.weightGsm.value}。`);
        if (dna.weave?.value) parts.push(`织法：${dna.weave.value}。`);
        if (dna.width?.value) parts.push(`幅宽：${dna.width.value}。`);
        if (dna.coating?.value) parts.push(`涂层：${dna.coating.value}。`);
        if (dna.waterproof?.value) parts.push(`防水：${dna.waterproof.value}。`);
        if (dna.color?.value) parts.push(`颜色：${dna.color.value}。`);
        if (dna.features?.value) parts.push(`特性：${dna.features.value}。`);
        return parts.join("");
      })(),
      confidence: 0.85,
      imageAssets,
      aiProvider,
    });

    return NextResponse.json(
      { success: true, requirement },
      { status: 201, headers: secureCorsHeaders(origin) }
    );
  } catch (error) {
    console.error("POST /api/bunana/requirements error:", error);
    const message = formatPublishError(error);
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: secureCorsHeaders(origin) });
  }
}

// ===== GET: 广场列表（公开） =====

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    /* 按 ID 查询单条记录 */
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const requirement = await getRequirementById(id);
      if (!requirement) {
        return NextResponse.json(
          { success: false, error: "记录不存在。", requirement: null },
          { status: 404, headers: secureCorsHeaders(origin) }
        );
      }
      return NextResponse.json(
        { success: true, requirement },
        { headers: secureCorsHeaders(origin) }
      );
    }

    /* 列表 */
    const requirements = await listRequirements();
    return NextResponse.json(
      { success: true, requirements },
      { headers: secureCorsHeaders(origin) }
    );
  } catch (error) {
    console.error("GET /api/bunana/requirements error:", error);
    const message = formatPublishError(error, "获取广场列表失败。", true);
    return NextResponse.json(
      { success: false, error: message, requirements: [] },
      { status: 500, headers: secureCorsHeaders(origin) }
    );
  }
}

function formatPublishError(
  error: unknown,
  fallback = "发布失败，请重试。",
  isRead = false
): string {
  if (error instanceof Error) {
    const message = error.message;
    if (/ENOTFOUND|fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
      return isRead
        ? "无法连接 Supabase 服务，请检查网络连接或服务配置。"
        : "无法连接 Supabase 服务，请检查网络连接或服务配置。";
    }
    if (/缺少 Supabase 环境变量/i.test(message)) {
      return message;
    }
    return message;
  }
  return fallback;
}
