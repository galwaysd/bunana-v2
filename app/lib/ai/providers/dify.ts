/**
 * Dify workflow fallback provider
 *
 * 仅 initial 模式走 Dify。
 * refine 模式由 Zhipu 负责。
 */
import type { DemandResult, ImagePayload } from "@/app/types";
import {
  sanitizeDemandResult,
  parseDataUrl
} from "../normalize";
import { fetchWithTimeout } from "./zhipu";

const aiRequestTimeoutMs = 20000;

export function difyBaseUrl(): string {
  return (process.env.DIFY_API_URL || "https://api.dify.ai/v1").replace(/\/$/, "");
}

export function hasDifyApiKey(): boolean {
  return Boolean(process.env.DIFY_API_KEY);
}

// ===== initial 模式 =====

export async function runDifyInitial(
  text: string,
  images: ImagePayload[],
  language: string,
  userId: string
): Promise<DemandResult> {
  // 上传图片到 Dify
  const uploadedFiles = await uploadImagesToDify(images, userId);

  const response = await fetchWithTimeout(
    `${difyBaseUrl()}/workflows/run`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: {
          user_text: text,
          language,
          image_files: uploadedFiles
        },
        files: uploadedFiles,
        response_mode: "blocking",
        user: userId
      })
    },
    aiRequestTimeoutMs
  );

  if (!response.ok) {
    throw new Error(`Dify workflow failed: ${await response.text()}`);
  }

  const payload = await response.json();
  const outputs = extractDifyOutputs(payload);
  const parsed =
    typeof outputs.result === "string"
      ? parseMaybeJson(outputs.result)
      : (outputs as Record<string, unknown>);

  const demandResult = sanitizeDemandResult(parsed);
  if (!demandResult.dna.fabricName.value && !demandResult.summary) {
    throw new Error("Dify returned invalid Fabric DNA JSON.");
  }

  return demandResult;
}

// ===== Dify 工具 =====

async function uploadImagesToDify(
  images: ImagePayload[],
  userId: string
): Promise<Array<{ type: string; transfer_method: string; upload_file_id: string }>> {
  return Promise.all(
    images.map(async (image) => {
      const { buffer, mimeType } = parseDataUrl(image.dataUrl);
      const formData = new FormData();
      formData.append("user", userId);
      formData.append("file", new Blob([buffer], { type: mimeType }), image.name);

      const response = await fetchWithTimeout(
        `${difyBaseUrl()}/files/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.DIFY_API_KEY}` },
          body: formData
        },
        aiRequestTimeoutMs
      );

      if (!response.ok) {
        throw new Error(`Dify file upload failed: ${await response.text()}`);
      }

      const payload = await response.json();
      return {
        type: "image",
        transfer_method: "local_file",
        upload_file_id: payload.id
      };
    })
  );
}

function extractDifyOutputs(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};

  const data = "data" in payload ? payload.data : undefined;
  if (data && typeof data === "object" && "outputs" in data) {
    const outputs = (data as Record<string, unknown>).outputs;
    return outputs && typeof outputs === "object"
      ? (outputs as Record<string, unknown>)
      : {};
  }

  if ("outputs" in payload) {
    const outputs = (payload as Record<string, unknown>).outputs;
    return outputs && typeof outputs === "object"
      ? (outputs as Record<string, unknown>)
      : {};
  }

  return payload as Record<string, unknown>;
}

function parseMaybeJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    const match =
      value.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
      value.match(/(\{[\s\S]*\})/);
    if (!match?.[1]) return {};
    try {
      return JSON.parse(match[1]);
    } catch {
      return {};
    }
  }
}
