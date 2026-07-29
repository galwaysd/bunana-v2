import type { ImagePayload } from "@/app/types";
import { hashFile } from "./hash";

/**
 * File → base64 dataUrl
 */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * File → ImagePayload（dataUrl + SHA-256 hash）
 */
export async function readImagePayload(file: File): Promise<ImagePayload> {
  const [dataUrl, imageHash] = await Promise.all([
    readFileAsDataUrl(file),
    hashFile(file)
  ]);

  return { name: file.name, dataUrl, imageHash };
}
