"use client";

import { useState, useCallback } from "react";
import type { FabricDNA, ImagePayload } from "@/app/types";
import type { PostType } from "@/app/lib/supabase/requirements";
import { useRouter } from "next/navigation";
import { apiPost } from "@/app/lib/api-client";
import { useI18n } from "@/app/i18n";
import type { Locale } from "@/app/i18n/translations";

const AUTO_SAVE_FAILED_MESSAGE: Record<Locale, string> = {
  zh: "发布已成功，卡片未自动保存。请点击“保存 Fabric DNA”手动保存。",
  en: "Published successfully, but the card was not saved automatically. Please use Save Fabric DNA to try again.",
  ja: "公開は完了しましたが、カードを自動保存できませんでした。「Fabric DNA を保存」から再試行してください。",
  ko: "게시는 완료되었지만 카드가 자동 저장되지 않았습니다. Fabric DNA 저장 버튼으로 다시 시도해 주세요."
};

const PUBLISHED_LABEL: Record<Locale, string> = {
  zh: "发布成功",
  en: "Published",
  ja: "公開済み",
  ko: "게시 완료"
};

type Props = {
  dna: FabricDNA;
  text: string;
  images: ImagePayload[];
  aiProvider: string;
  postType: PostType | null;
  onPublishSuccess?: () => Promise<boolean>;
};

export default function PublishButton({
  dna,
  text,
  images,
  aiProvider,
  postType,
  onPublishSuccess
}: Props) {
  const { locale, t } = useI18n();
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();

  const handlePublish = useCallback(async () => {
    if (publishing || published) return;
    if (!postType) {
      setError(t("home.postType.required"));
      return;
    }

    setPublishing(true);
    setError("");
    setNotice("");

    try {
      const data = await apiPost<{ success: boolean; error?: string }>(
        "/api/bunana/requirements",
        { text, dna, images, aiProvider, postType }
      );

      if (!data.success) {
        setError(data.error ?? t("publish.publishError"));
        return;
      }

      // requirement 已正式发布。PNG 保存是独立的后续动作，失败不能重发记录。
      setPublished(true);

      let cardSaved = true;
      if (onPublishSuccess) {
        try {
          cardSaved = await onPublishSuccess();
        } catch (saveError) {
          console.error("Automatic PNG save failed:", saveError);
          cardSaved = false;
        }
      }

      if (cardSaved) {
        router.push("/square");
      } else {
        setNotice(AUTO_SAVE_FAILED_MESSAGE[locale]);
      }
    } catch (e) {
      console.error("Publish error:", e);
      setError(t("publish.networkError"));
    } finally {
      setPublishing(false);
    }
  }, [publishing, published, dna, text, images, aiProvider, postType, onPublishSuccess, locale, router, t]);

  const disabled = publishing || published || !postType;

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <button
        onClick={handlePublish}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "0.75rem",
          border: "none",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          background: disabled ? "#cfd8dc" : "#1565c0",
          color: "#fff",
          transition: "background 0.2s",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {publishing
          ? t("publish.publishing")
          : published
            ? PUBLISHED_LABEL[locale]
            : t("publish.publish")}
      </button>
      {notice && (
        <div
          role="status"
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            background: "#fff8e1",
            border: "1px solid #ffe082",
            color: "#6d4c00",
            fontSize: "0.85rem"
          }}
        >
          {notice}
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            background: "#fff0f0",
            border: "1px solid #ffcdd2",
            color: "#c62828",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
