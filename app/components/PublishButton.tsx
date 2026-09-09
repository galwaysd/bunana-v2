"use client";

import { useState, useCallback } from "react";
import type { FabricDNA, ImagePayload } from "@/app/types";
import type { PostType } from "@/app/lib/supabase/requirements";
import { useRouter } from "next/navigation";
import { apiPost } from "@/app/lib/api-client";
import { useI18n } from "@/app/i18n";
import type { Locale } from "@/app/i18n/translations";

const AUTO_SAVE_FAILED_MESSAGE: Record<Locale, string> = {
  zh: "已发布，摘要未能下载，请重试下载。",
  en: "Published, but the summary could not be downloaded. Please retry the download.",
  ja: "公開は完了しましたが、要約をダウンロードできませんでした。もう一度お試しください。",
  ko: "게시는 완료되었지만 요약을 다운로드하지 못했습니다. 다시 다운로드해 주세요."
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
  /** 输入已变化时禁止发布旧结果 */
  disabled?: boolean;
  /** 将发布事务锁同步给同页输入、编辑与下载控件 */
  onPublishingChange?: (publishing: boolean) => void;
};

export default function PublishButton({
  dna,
  text,
  images,
  aiProvider,
  postType,
  onPublishSuccess,
  disabled = false,
  onPublishingChange
}: Props) {
  const { locale, t } = useI18n();
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();

  const handlePublish = useCallback(async () => {
    if (publishing || published || disabled) return;
    if (!postType) {
      setError(t("home.postType.required"));
      return;
    }

    setPublishing(true);
    onPublishingChange?.(true);
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
      onPublishingChange?.(false);
    }
  }, [publishing, published, disabled, dna, text, images, aiProvider, postType, onPublishSuccess, onPublishingChange, locale, router, t]);

  const actionDisabled = disabled || publishing || published || !postType;

  return (
    <div className="workbench-action workbench-action-primary">
      <button
        type="button"
        onClick={handlePublish}
        disabled={actionDisabled}
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
