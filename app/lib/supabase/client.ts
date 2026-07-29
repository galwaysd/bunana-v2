/**
 * Supabase 服务端客户端（纯 fetch，不依赖 @supabase/supabase-js SDK）
 * 所有写操作使用 serviceRoleKey 绕过 RLS
 */

export type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

let _cachedConfig: SupabaseConfig | null = null;

export function getSupabaseConfig(): SupabaseConfig {
  if (_cachedConfig) return _cachedConfig;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceRoleKey) {
    throw new Error("缺少 Supabase 环境变量。请配置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。");
  }

  _cachedConfig = { url, anonKey, serviceRoleKey };
  return _cachedConfig;
}

/** serviceRole 读——绕过 RLS */
export async function supabaseSelect<T>(path: string): Promise<T[]> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Supabase SELECT ${path} 失败 (${resp.status}): ${text}`);
  }
  return resp.json();
}

/** serviceRole 写——绕过 RLS */
export async function supabaseWrite<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> ?? {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Supabase WRITE ${path} 失败 (${resp.status}): ${text}`);
  }
  // 204 No Content
  if (resp.status === 204) return undefined as unknown as T;
  return resp.json();
}

/** 重置缓存（测试用） */
export function resetSupabaseConfig(): void {
  _cachedConfig = null;
}
