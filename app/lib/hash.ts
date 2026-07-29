/**
 * 图片 SHA-256 哈希（前端用 Web Crypto API）
 * 用于图片去重：相同图片产生相同 hash
 */
export async function hashFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
