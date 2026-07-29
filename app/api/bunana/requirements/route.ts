/**
 * POST /api/bunana/requirements — 发布需求到广场
 * GET  /api/bunana/requirements — 获取广场列表
 *
 * V2 不做登录，所有记录 user_id = null。
 * 仅服务端使用 serviceRoleKey 读写。
 */
import { NextRequest, NextResponse } from "next/server";
import { insertRequirement, listRequirements } from "@/app/lib/supabase/requirements";
import { persistImageFromDataUrl } from "@/app/lib/supabase/images";
import type { ImagePayload, FabricDNA } from "@/app/types";
import { buildSpecsFromDNA } from "@/app/lib/dna";

// ===== 发布 =====

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const text: string = (body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ success: false, error: "需求文本不能为空。" }, { status: 400 });
    }

    const dna: FabricDNA | undefined = body.dna;
    if (!dna) {
      return NextResponse.json({ success: false, error: "缺少 Fabric DNA。" }, { status: 400 });
    }

    const images: ImagePayload[] = Array.isArray(body.images) ? body.images : [];
    const aiProvider: string = body.aiProvider ?? "demo";

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
      keywords: [...new Set(keywords)].filter(Boolean).slice(0, 10),
      summary: `Fabric DNA 已构建完成。${dna.composition?.value ? `成分：${dna.composition.value}。` : ""}${specs}`,
      confidence: 0.85,
      imageAssets,
      aiProvider,
    });

    return NextResponse.json({ success: true, requirement }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bunana/requirements error:", error);
    const message = error instanceof Error ? error.message : "发布失败，请重试。";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ===== 广场列表 =====

export async function GET() {
  try {
    const requirements = await listRequirements();
    return NextResponse.json({ success: true, requirements });
  } catch (error) {
    console.error("GET /api/bunana/requirements error:", error);
    const message = error instanceof Error ? error.message : "获取广场列表失败。";
    return NextResponse.json({ success: false, error: message, requirements: [] }, { status: 500 });
  }
}
