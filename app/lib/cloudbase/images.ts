import { createHash } from "node:crypto";
import { cloudBaseSelect, cloudBaseWrite } from "./client";
import { parseDataUrl, uploadImageToStorage } from "./storage";

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

export async function findImageAssetByHash(
  sha256: string
): Promise<ImageAsset | null> {
  const rows = await cloudBaseSelect<Record<string, unknown>>(
    `image_assets?sha256=eq.${encodeURIComponent(sha256)}&select=*&limit=1`
  );
  return rows.length > 0 ? mapImageAsset(rows[0]) : null;
}

export async function findImageAssetById(id: string): Promise<ImageAsset | null> {
  const rows = await cloudBaseSelect<Record<string, unknown>>(
    `image_assets?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  );
  return rows.length > 0 ? mapImageAsset(rows[0]) : null;
}

export async function upsertImageAsset(input: {
  sha256: string;
  storagePath: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
}): Promise<ImageAsset> {
  const existing = await findImageAssetByHash(input.sha256);
  if (existing) return existing;

  const rows = await cloudBaseWrite<Record<string, unknown>[]>(
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

  if (Array.isArray(rows) && rows.length > 0) return mapImageAsset(rows[0]);

  const raceWinner = await findImageAssetByHash(input.sha256);
  if (!raceWinner) throw new Error("图片元数据保存失败。");
  return raceWinner;
}

export async function persistImageFromDataUrl(
  dataUrl: string,
  _imageHash: string | undefined,
  originalName: string
): Promise<ImageAsset> {
  const { mimeType, buffer, extension } = parseDataUrl(dataUrl);
  const normalizedHash = createHash("sha256").update(buffer).digest("hex");

  const existing = await findImageAssetByHash(normalizedHash);
  if (existing) return { ...existing, reused: true };

  const { storagePath, publicUrl } = await uploadImageToStorage(extension, buffer);
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
