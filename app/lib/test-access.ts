import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  secureCorsHeaders,
  validateConfiguredApiSecret,
} from "@/app/lib/auth";

export const TEST_ACCESS_COOKIE_NAME = "bunana_test_access";
export const TEST_ACCESS_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const TEST_ACCESS_VERSION = 1;
const TEST_ACCESS_PURPOSE = "bunana-test-access";
const CLOCK_SKEW_SECONDS = 60;

type TestAccessPayload = {
  v: number;
  purpose: typeof TEST_ACCESS_PURPOSE;
  iat: number;
  exp: number;
  nonce: string;
};

function getAccessCode(): string {
  return process.env.BUNANA_TEST_ACCESS_CODE?.trim() ?? "";
}

function getAccessSecret(): string {
  return process.env.BUNANA_TEST_ACCESS_SECRET?.trim() ?? "";
}

export function isTestAccessEnabled(): boolean {
  return process.env.BUNANA_TEST_ACCESS_ENABLED?.trim() === "true";
}

function digest(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value).digest();
}

function safeBufferEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function signPayload(encodedPayload: string, secret: string): string {
  return digest(`${TEST_ACCESS_PURPOSE}.${encodedPayload}`, secret).toString(
    "base64url"
  );
}

export function isTestAccessConfigured(): boolean {
  return getAccessCode().length > 0 && getAccessSecret().length > 0;
}

export function verifyTestAccessCode(candidate: unknown): boolean {
  if (typeof candidate !== "string" || !isTestAccessConfigured()) return false;

  const secret = getAccessSecret();
  const expected = digest(getAccessCode(), secret);
  const actual = digest(candidate, secret);
  return safeBufferEqual(expected, actual);
}

export function createTestAccessSession(): {
  token: string;
  expiresAt: Date;
} {
  const secret = getAccessSecret();
  if (!secret) throw new Error("Test access is not configured");

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: TestAccessPayload = {
    v: TEST_ACCESS_VERSION,
    purpose: TEST_ACCESS_PURPOSE,
    iat: issuedAt,
    exp: issuedAt + TEST_ACCESS_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  const signature = signPayload(encodedPayload, secret);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(payload.exp * 1000),
  };
}

export function verifyTestAccessToken(token: unknown): boolean {
  if (typeof token !== "string" || token.length > 2048) return false;

  const secret = getAccessSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  const [encodedPayload, signature] = parts;
  const expectedSignature = signPayload(encodedPayload, secret);

  let actualSignature: Buffer;
  let expectedSignatureBuffer: Buffer;
  try {
    actualSignature = Buffer.from(signature, "base64url");
    expectedSignatureBuffer = Buffer.from(expectedSignature, "base64url");
  } catch {
    return false;
  }

  if (!safeBufferEqual(actualSignature, expectedSignatureBuffer)) return false;

  let payload: TestAccessPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as TestAccessPayload;
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return (
    payload.v === TEST_ACCESS_VERSION &&
    payload.purpose === TEST_ACCESS_PURPOSE &&
    Number.isInteger(payload.iat) &&
    Number.isInteger(payload.exp) &&
    typeof payload.nonce === "string" &&
    payload.nonce.length > 0 &&
    payload.iat <= now + CLOCK_SKEW_SECONDS &&
    payload.exp > now &&
    payload.exp > payload.iat &&
    payload.exp - payload.iat <= TEST_ACCESS_MAX_AGE_SECONDS &&
    payload.exp <= now + TEST_ACCESS_MAX_AGE_SECONDS + CLOCK_SKEW_SECONDS
  );
}

export function hasValidTestAccessSession(request: NextRequest): boolean {
  return verifyTestAccessToken(
    request.cookies.get(TEST_ACCESS_COOKIE_NAME)?.value
  );
}

export function hasProtectedWriteAccess(request: NextRequest): boolean {
  if (!isTestAccessEnabled()) return true;

  return (
    hasValidTestAccessSession(request) ||
    validateConfiguredApiSecret(request)
  );
}

export function testAccessRequiredResponse(request: NextRequest): NextResponse {
  return NextResponse.json(
    {
      success: false,
      code: "TEST_ACCESS_REQUIRED",
      error: "需要测试访问权限。",
    },
    {
      status: 401,
      headers: secureCorsHeaders(request.headers.get("origin")),
    }
  );
}

export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.includes("\\")) return "/";
  if (/\p{Cc}/u.test(value)) return "/";

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "/";
  }

  if (decoded.startsWith("//") || decoded.includes("\\")) return "/";

  try {
    const base = new URL("https://bunana.invalid");
    const target = new URL(value, base);
    if (target.origin !== base.origin) return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}
