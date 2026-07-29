/**
 * Supabase Storage 上传（dataUrl → buffer → Storage）
 */
import { getSupabaseConfig } from "./client";

/** 将 base64 dataUrl 的每个路径段编码为 URI-safe */
function encodeStoragePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export type StorageUploadResult = {
  storagePath: string;
  publicUrl: string;
};

/**
 * 上传图片 buffer 到 fabric-samples bucket
 * dataUrl 格式: data:image/png;base64,...
 */
export async function uploadImageToStorage(
  extension: string,
  buffer: Buffer,
): Promise<StorageUploadResult> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const sha256 = await hashBuffer(buffer);
  const fileName = `${sha256}.${extension}`;
  const encodedPath = encodeStoragePath(fileName);

  const uploadUrl = `${url}/storage/v1/object/fabric-samples/${encodedPath}`;
  const resp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": getMimeFromExt(extension),
      "x-upsert": "false",
      "Cache-Control": "max-age=31536000, immutable",
    },
    body: buffer,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Storage 上传失败 (${resp.status}): ${text}`);
  }

  const publicUrl = `${url}/storage/v1/object/public/fabric-samples/${encodedPath}`;

  return { storagePath: fileName, publicUrl };
}

/** 对 buffer 做 SHA-256 */
async function hashBuffer(buffer: Buffer): Promise<string> {
  return require("crypto").createHash("sha256").update(buffer).digest("hex");
}

function getMimeFromExt(ext: string): string {
  switch (ext) {
    case "png": return "image/png";
    case "webp": return "image/webp";
    default: return "image/jpeg";
  }
}

/**
 * 解析 dataUrl → { mimeType, buffer, extension }
 */
export function parseDataUrl(dataUrl: string): {
  mimeType: string;
  buffer: Buffer;
  extension: string;
} {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("图片 dataUrl 格式无效。");
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const extension = mimeToExt(mimeType);
  return { mimeType, buffer, extension };
}

function mimeToExt(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}
