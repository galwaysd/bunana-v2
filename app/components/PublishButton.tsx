"use client";

import { useState, useCallback } from "react";
import type { FabricDNA, ImagePayload } from "@/app/types";
import type { PostType } from "@/app/lib/supabase/requirements";
import { useRouter } from "next/navigation";
import { apiPost } from "@/app/lib/api-client";
import { useI18n } from "@/app/i18n";
import type { Locale } from "@/app/i18n/translations";

const AUTO_SAVE_FAILED_MESSAGE: Record<Locale, string> = {
  zh: "发布已成功，卡片未自动保存。请点击“保存布料档案”手动保存。",
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
    <div className="workbench-action workbench-action-primary">
      <button
        type="button"
        onClick={handlePublish}
        disabled={disabled}
        className="workbench-action-button"
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
          className="workbench-action-message is-notice"
        >
          {notice}
        </div>
      )}
      {error && (
        <div className="workbench-action-message is-error">
          {error}
        </div>
      )}
    </div>
  );
}
