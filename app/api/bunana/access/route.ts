import { NextRequest, NextResponse } from "next/server";
import { secureCorsHeaders } from "@/app/lib/auth";
import { checkRateLimit, getClientIP } from "@/app/lib/rate-limit";
import {
  createTestAccessSession,
  isTestAccessConfigured,
  sanitizeReturnTo,
  TEST_ACCESS_COOKIE_NAME,
  TEST_ACCESS_MAX_AGE_SECONDS,
  verifyTestAccessCode,
} from "@/app/lib/test-access";

export const runtime = "nodejs";

const ACCESS_ATTEMPT_LIMIT = 5;
const ACCESS_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const headers = secureCorsHeaders(request.headers.get("origin"));
  const rate = checkRateLimit(
    `test-access:${getClientIP(request)}`,
    ACCESS_ATTEMPT_LIMIT,
    ACCESS_ATTEMPT_WINDOW_MS
  );

  if (!rate.allowed) {
    const retryAfter = Math.max(
      1,
      Math.ceil((rate.resetAt - Date.now()) / 1000)
    );
    return NextResponse.json(
      { success: false, error: "请求过于频繁，请稍后重试。" },
      {
        status: 429,
        headers: { ...headers, "Retry-After": String(retryAfter) },
      }
    );
  }

  if (!isTestAccessConfigured()) {
    return NextResponse.json(
      { success: false, error: "测试访问暂不可用，请稍后重试。" },
      { status: 503, headers }
    );
  }

  let body: { code?: unknown; returnTo?: unknown };
  try {
    body = (await request.json()) as { code?: unknown; returnTo?: unknown };
  } catch {
    return NextResponse.json(
      { success: false, error: "访问口令无效。" },
      { status: 401, headers }
    );
  }

  if (!verifyTestAccessCode(body.code)) {
    return NextResponse.json(
      { success: false, error: "访问口令无效。" },
      { status: 401, headers }
    );
  }

  const session = createTestAccessSession();
  const response = NextResponse.json(
    { success: true, returnTo: sanitizeReturnTo(body.returnTo) },
    { headers }
  );
  response.cookies.set({
    name: TEST_ACCESS_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: TEST_ACCESS_MAX_AGE_SECONDS,
    expires: session.expiresAt,
  });
  return response;
}
