/**
 * 内存速率限制器 — 防止 API 滥用
 *
 * 使用滑动窗口算法，按 IP 地址限流。
 * 注意：在 Vercel Serverless 环境中，每次请求可能在不同的实例中处理，
 * 因此内存限流仅作为基本防护，生产环境建议使用 Upstash Redis 等方案。
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix ms
}

const store = new Map<string, RateLimitEntry>();

/** 清理过期条目（每 100 次调用触发一次） */
let cleanCounter = 0;
function maybeCleanup() {
  cleanCounter++;
  if (cleanCounter % 100 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/**
 * 检查请求是否超出速率限制
 * @param key - 通常是 IP 地址
 * @param maxRequests - 窗口内最大请求数
 * @param windowMs - 时间窗口（毫秒）
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  maybeCleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // 新窗口
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * 从 NextRequest 提取客户端 IP
 */
export function getClientIP(request: Request): string {
  // Vercel 会设置 x-forwarded-for 头
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  // 回退：x-real-ip
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP.trim();

  return "unknown";
}

/**
 * 返回 429 速率限制响应
 */
export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      success: false,
      error: `请求过于频繁，请 ${retryAfter} 秒后重试。`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
