/**
 * requirements 表操作：发布 / 列表
 */
import { supabaseSelect, supabaseWrite } from "./client";
import type { ImageAsset } from "./images";

export type RequirementRow = {
  id: string;
  text: string;
  category: string;
  fabricName: string;
  specs: string;
  keywords: string[];
  summary: string;
  confidence: number;
  imageIds: string[];
  images: Array<{
    id: string;
    url: string;
    originalName: string;
    reused: boolean;
  }>;
  aiProvider: string;
  createdAt: string;
};

export type PublishInput = {
  text: string;
  category: string;
  fabricName: string;
  specs: string;
  keywords: string[];
  summary: string;
  confidence: number;
  imageAssets: ImageAsset[];
  aiProvider: string;
};

export async function insertRequirement(input: PublishInput): Promise<RequirementRow> {
  const images = input.imageAssets.map((asset) => ({
    id: asset.id,
    url: `/api/bunana/images/${asset.id}`,
    originalName: asset.originalName,
    reused: asset.reused,
  }));

  const body = {
    text: input.text,
    category: input.category,
    fabric_name: input.fabricName,
    specs: input.specs,
    keywords: input.keywords,
    summary: input.summary,
    confidence: input.confidence,
    image_ids: input.imageAssets.map((a) => a.id),
    images,
    ai_provider: input.aiProvider,
  };

  const rows = await supabaseWrite<Record<string, unknown>[]>("requirements", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body),
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("发布需求记录失败。");
  }

  return mapRequirement(rows[0]);
}

export async function listRequirements(): Promise<RequirementRow[]> {
  const rows = await supabaseSelect<Record<string, unknown>>(
    "requirements?select=*&order=created_at.desc&limit=100"
  );
  return rows.map(mapRequirement);
}

export async function getRequirementById(id: string): Promise<RequirementRow | null> {
  const rows = await supabaseSelect<Record<string, unknown>>(
    `requirements?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return mapRequirement(rows[0]);
}

function mapRequirement(row: Record<string, unknown>): RequirementRow {
  return {
    id: String(row.id ?? ""),
    text: String(row.text ?? ""),
    category: String(row.category ?? "其他面料"),
    fabricName: String(row.fabric_name ?? ""),
    specs: String(row.specs ?? ""),
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    summary: String(row.summary ?? ""),
    confidence: Number(row.confidence ?? 0),
    imageIds: Array.isArray(row.image_ids) ? row.image_ids.map(String) : [],
    images: Array.isArray(row.images)
      ? (row.images as Record<string, unknown>[]).map((img) => ({
          id: String(img.id ?? ""),
          url: String(img.url ?? ""),
          originalName: String(img.originalName ?? ""),
          reused: Boolean(img.reused),
        }))
      : [],
    aiProvider: String(row.ai_provider ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}
