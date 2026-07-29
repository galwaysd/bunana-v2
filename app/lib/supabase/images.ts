/**
 * image_assets 表操作：查找 / 去重 / upsert
 */
import { supabaseSelect, supabaseWrite } from "./client";
import { uploadImageToStorage, parseDataUrl } from "./storage";

export type ImageAsset = {
  id: string;
  sha256: string;
  storagePath: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
  reused: boolean;
};

/** 按 SHA-256 查找已有图片 */
export async function findImageAssetByHash(sha256: string): Promise<ImageAsset | null> {
  const rows = await supabaseSelect<Record<string, unknown>>(
    `image_assets?sha256=eq.${sha256}&select=*&limit=1`
  );
  if (!rows || rows.length === 0) return null;
  return mapImageAsset(rows[0]);
}

/** 按 ID 查找图片 */
export async function findImageAssetById(id: string): Promise<ImageAsset | null> {
  const rows = await supabaseSelect<Record<string, unknown>>(
    `image_assets?id=eq.${id}&select=*&limit=1`
  );
  if (!rows || rows.length === 0) return null;
  return mapImageAsset(rows[0]);
}

/** Upsert 图片元数据（冲突键 sha256） */
export async function upsertImageAsset(input: {
  sha256: string;
  storagePath: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
}): Promise<ImageAsset> {
  // 快速路径：已存在则直接返回
  const existing = await findImageAssetByHash(input.sha256);
  if (existing) return existing;

  // 写入（on_conflict=sha256, resolution=ignore-duplicates）
  const rows = await supabaseWrite<Record<string, unknown>[]>(
    "image_assets?on_conflict=sha256",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({
        sha256: input.sha256,
        storage_path: input.storagePath,
        public_url: input.publicUrl,
        original_name: input.originalName,
        mime_type: input.mimeType,
        size: input.size,
      }),
    }
  );

  if (Array.isArray(rows) && rows.length > 0) {
    return mapImageAsset(rows[0]);
  }

  // 竞态回退：其他请求已写入
  const raceWinner = await findImageAssetByHash(input.sha256);
  if (!raceWinner) throw new Error("图片元数据保存失败。");
  return raceWinner;
}

/** dataUrl → 持久化图片（含去重） */
export async function persistImageFromDataUrl(
  dataUrl: string,
  imageHash: string | undefined,
  originalName: string,
): Promise<ImageAsset> {
  // 1. 解析 dataUrl（优先于 hash 计算，确保 buffer 可用）
  const { mimeType, buffer, extension } = parseDataUrl(dataUrl);

  // 2. SHA-256 从 buffer 计算（比客户端传入更可靠，且自动兜底）
  const { createHash } = await import("node:crypto");
  const normalizedHash = imageHash?.trim().toLowerCase()
    ?? createHash("sha256").update(buffer).digest("hex");

  // 3. 去重检查
  const existing = await findImageAssetByHash(normalizedHash);
  if (existing) {
    return { ...existing, reused: true };
  }

  // 4. 上传 Storage
  const { storagePath, publicUrl } = await uploadImageToStorage(extension, buffer);

  // 5. Upsert 元数据
  const asset = await upsertImageAsset({
    sha256: normalizedHash,
    storagePath,
    publicUrl,
    originalName,
    mimeType,
    size: buffer.length,
  });

  return { ...asset, reused: false };
}

function mapImageAsset(row: Record<string, unknown>): ImageAsset {
  return {
    id: String(row.id ?? ""),
    sha256: String(row.sha256 ?? ""),
    storagePath: String(row.storage_path ?? ""),
    publicUrl: String(row.public_url ?? ""),
    originalName: String(row.original_name ?? ""),
    mimeType: String(row.mime_type ?? ""),
    size: Number(row.size ?? 0),
    reused: false,
  };
}
