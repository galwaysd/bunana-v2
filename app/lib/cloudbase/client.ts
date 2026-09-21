/**
 * CloudBase PostgreSQL Data API client for server-only Bunana publishing.
 * The API key is never exposed to browser code.
 */

export type CloudBaseConfig = {
  envId: string;
  apiKey: string;
  gatewayUrl: string;
};

let cachedConfig: CloudBaseConfig | null = null;

export function getCloudBaseConfig(): CloudBaseConfig {
  if (cachedConfig) return cachedConfig;

  const envId = (process.env.CLOUDBASE_ENV_ID ?? "").trim();
  const apiKey = (process.env.CLOUDBASE_APIKEY ?? "").trim();

  if (!envId || !apiKey) {
    throw new Error(
      "缺少 CloudBase 环境变量。请配置 CLOUDBASE_ENV_ID 和 CLOUDBASE_APIKEY。"
    );
  }

  if (!/^[a-zA-Z0-9-]+$/.test(envId)) {
    throw new Error("CLOUDBASE_ENV_ID 格式无效。");
  }

  cachedConfig = {
    envId,
    apiKey,
    gatewayUrl: `https://${envId}.api.tcloudbasegateway.com`,
  };
  return cachedConfig;
}

function authorizationHeaders(): Record<string, string> {
  const { apiKey } = getCloudBaseConfig();
  return { Authorization: `Bearer ${apiKey}` };
}

export async function cloudBaseSelect<T>(path: string): Promise<T[]> {
  const { gatewayUrl } = getCloudBaseConfig();
  const response = await fetch(`${gatewayUrl}/v1/rdb/rest/${path}`, {
    headers: authorizationHeaders(),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`CloudBase SELECT ${path} 失败 (${response.status}): ${detail}`);
  }
  return response.json();
}

export async function cloudBaseWrite<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { gatewayUrl } = getCloudBaseConfig();
  const response = await fetch(`${gatewayUrl}/v1/rdb/rest/${path}`, {
    ...init,
    headers: {
      ...authorizationHeaders(),
      "Content-Type": "application/json",
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`CloudBase WRITE ${path} 失败 (${response.status}): ${detail}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export function resetCloudBaseConfig(): void {
  cachedConfig = null;
}
