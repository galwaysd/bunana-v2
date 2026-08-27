"use client";

import { useI18n } from "@/app/i18n";

export default function WeavingLoader() {
  const { t } = useI18n();
  return (
    <div className="weaving-loader">
      <div className="weaving-loader-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <span>
        {t("weavingLoader.loading")}
      </span>
    </div>
  );
}
