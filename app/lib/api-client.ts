/**
 * 客户端 API 调用工具
 *
 * 自动为受保护的写操作添加 x-bunana-api-secret 认证头。
 * 密钥通过 NEXT_PUBLIC_BUNANA_API_SECRET 注入。
 *
 * 安全注意：
 * - 该密钥会被打包到客户端 JS 中，在浏览器 DevTools 可见
 * - 这阻止了外部网站/脚本的直接滥用，但无法防止有意的用户提取
 * - 配合速率限制和 RLS 策略，提供 MVP 阶段的基本防护
 * - 正式上线后建议迁移为 CSRF token 或用户登录认证
 */

const API_SECRET = process.env.NEXT_PUBLIC_BUNANA_API_SECRET ?? "";

/** 返回需要认证的请求头 */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (API_SECRET) {
    headers["x-bunana-api-secret"] = API_SECRET;
  }
  return headers;
}

/** 带认证的 POST 请求 */
export async function apiPost<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return resp.json();
}

/** 带认证的 PUT 请求 */
export async function apiPut<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  const resp = await fetch(url, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return resp.json();
}

/** 公开 GET 请求（无需认证） */
export async function apiGet<T = unknown>(url: string): Promise<T> {
  const resp = await fetch(url);
  return resp.json();
}
