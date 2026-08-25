/**
 * Bunana API 认证工具
 *
 * Server-side compatibility authentication for trusted callers and debugging.
 * Browser writes use the signed test-access cookie instead.
 */
import { NextRequest } from "next/server";

const AUTH_HEADER = "x-bunana-api-secret";

/** 获取配置的 API 密钥 */
export function getApiSecret(): string {
  return process.env.BUNANA_API_SECRET ?? "";
}

/** 检查 API 密钥是否已配置 */
export function hasApiSecret(): boolean {
  return getApiSecret().length > 0;
}

/** 验证请求是否携带正确的 API 密钥 */
export function validateApiSecret(request: NextRequest): boolean {
  const secret = getApiSecret();
  if (!secret) {
    // 未配置密钥 = 不强制认证（向后兼容本地开发）
    return true;
  }
  const headerValue = request.headers.get(AUTH_HEADER);
  return headerValue === secret;
}

/** Validate the legacy header only when its server-side secret is configured. */
export function validateConfiguredApiSecret(request: NextRequest): boolean {
  return hasApiSecret() && validateApiSecret(request);
}

/** CORS 头 — 严格白名单 */
export function secureCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    process.env.BUNANA_ALLOWED_ORIGIN ?? "",
    "https://bunana-v2.vercel.app",
  ].filter(Boolean);

  const allowOrigin =
    origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0] || "";

  return {
    "Access-Control-Allow-Origin": allowOrigin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": `Content-Type, Authorization, ${AUTH_HEADER}`,
    "Access-Control-Max-Age": "86400",
    // 安全响应头
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

/** 返回 401 未授权响应 */
export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ success: false, error: "未授权的请求，缺少有效的 API 密钥。" }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...secureCorsHeaders(null),
      },
    }
  );
}
