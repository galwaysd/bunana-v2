/**
 * GET /api/bunana/images/[id] — 图片重定向代理
 * 将 image_assets 表 ID 映射为 Supabase Storage 公开 URL（302 重定向）
 */
import { NextRequest, NextResponse } from "next/server";
import { findImageAssetById } from "@/app/lib/supabase/images";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await findImageAssetById(id);

    if (!asset) {
      return NextResponse.json(
        { success: false, error: "图片不存在。" },
        { status: 404 }
      );
    }

    return NextResponse.redirect(asset.publicUrl, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("GET /api/bunana/images/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "获取图片失败。" },
      { status: 500 }
    );
  }
}
