import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;

function getTokenPepper(): string {
  const pepper = process.env.BUNANA_CHAT_TOKEN_PEPPER?.trim() ?? "";
  if (!pepper) throw new Error("BUNANA_CHAT_TOKEN_PEPPER is not configured.");
  return pepper;
}

export function createParticipantToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashParticipantToken(token: string): string {
  return createHmac("sha256", getTokenPepper()).update(token).digest("hex");
}

export function tokenHashMatches(actual: string, expected: string | null): boolean {
  if (!expected || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

