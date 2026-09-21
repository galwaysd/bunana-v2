import type { FabricDNA } from "@/app/types";
import { cloudBaseSelect, cloudBaseWrite } from "./client";
import type { ImageAsset } from "./images";

export type PostType = "seeking" | "offering";

export type RequirementRow = {
  id: string;
  text: string;
  category: string;
  fabricName: string;
  specs: string;
  postType: PostType;
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
  fabricDna: FabricDNA | null;
  createdAt: string;
};

export type PublishInput = {
  text: string;
  category: string;
  fabricName: string;
  specs: string;
  postType: PostType;
  keywords: string[];
  summary: string;
  confidence: number;
  imageAssets: ImageAsset[];
  aiProvider: string;
  fabricDna: FabricDNA;
};

export async function insertRequirement(
  input: PublishInput
): Promise<RequirementRow> {
  const images = input.imageAssets.map((asset) => ({
    id: asset.id,
    url: `/api/bunana/images/${asset.id}`,
    originalName: asset.originalName,
    reused: asset.reused,
  }));

  const rows = await cloudBaseWrite<Record<string, unknown>[]>("requirements", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      text: input.text,
      category: input.category,
      fabric_name: input.fabricName,
      specs: input.specs,
      post_type: input.postType,
      keywords: input.keywords,
      summary: input.summary,
      confidence: input.confidence,
      image_ids: input.imageAssets.map((asset) => asset.id),
      images,
      ai_provider: input.aiProvider,
      fabric_dna: input.fabricDna,
    }),
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("发布需求记录失败。");
  }
  return mapRequirement(rows[0]);
}

export async function listRequirements(): Promise<RequirementRow[]> {
  const rows = await cloudBaseSelect<Record<string, unknown>>(
    "requirements?select=*&order=created_at.desc&limit=100"
  );
  return rows.map(mapRequirement);
}

export async function getRequirementById(
  id: string
): Promise<RequirementRow | null> {
  const rows = await cloudBaseSelect<Record<string, unknown>>(
    `requirements?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  return rows.length > 0 ? mapRequirement(rows[0]) : null;
}

function mapRequirement(row: Record<string, unknown>): RequirementRow {
  return {
    id: String(row.id ?? ""),
    text: String(row.text ?? ""),
    category: String(row.category ?? "其他面料"),
    fabricName: String(row.fabric_name ?? ""),
    specs: String(row.specs ?? ""),
    postType: row.post_type === "offering" ? "offering" : "seeking",
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    summary: String(row.summary ?? ""),
    confidence: Number(row.confidence ?? 0),
    imageIds: Array.isArray(row.image_ids) ? row.image_ids.map(String) : [],
    images: Array.isArray(row.images)
      ? (row.images as Record<string, unknown>[]).map((image) => ({
          id: String(image.id ?? ""),
          url: String(image.url ?? ""),
          originalName: String(image.originalName ?? ""),
          reused: Boolean(image.reused),
        }))
      : [],
    aiProvider: String(row.ai_provider ?? ""),
    fabricDna:
      row.fabric_dna &&
      typeof row.fabric_dna === "object" &&
      !Array.isArray(row.fabric_dna)
        ? (row.fabric_dna as FabricDNA)
        : null,
    createdAt: String(row.created_at ?? ""),
  };
}
