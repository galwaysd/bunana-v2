import { createHash } from "node:crypto";
import { getCloudBaseConfig } from "./client";

const FABRIC_BUCKET = "fabric-samples";

export type StorageUploadResult = {
  storagePath: string;
  publicUrl: string;
};

export async function uploadImageToStorage(
  extension: string,
  buffer: Buffer
): Promise<StorageUploadResult> {
  const { apiKey, gatewayUrl } = getCloudBaseConfig();
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const storagePath = `${sha256}.${extension}`;
  const objectUrl = buildObjectUrl(gatewayUrl, storagePath);

  const response = await fetch(objectUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": getMimeFromExt(extension),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: buffer,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`CloudBase Storage 上传失败 (${response.status}): ${detail}`);
  }

  return { storagePath, publicUrl: objectUrl };
}

function buildObjectUrl(gatewayUrl: string, storagePath: string): string {
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${gatewayUrl}/v1/storages/object/${FABRIC_BUCKET}/${encodedPath}`;
}

function getMimeFromExt(extension: string): string {
  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

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
