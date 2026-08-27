"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { RequirementRow } from "@/app/lib/supabase/requirements";
import { DNA_FIELD_KEYS } from "@/app/lib/dna";
import { useI18n, LOCALE_TO_DATE } from "@/app/i18n";
import styles from "../square.module.css";

/* ----- 从 specs 中解析规格项（支持结构化 key:value|key:value 格式 + 旧逗号分隔格式） ----- */
function parseSpecsIntoGrid(
  specs: string,
  specLabel: string,
  t: (path: string, vars?: Record<string, string | number>) => string
): { label: string; value: string }[] {
  if (!specs || specs === "待确认" || specs === "TBD" || specs === "未定" || specs === "미정") return [];

  // 新格式：key:value|key:value
  if (specs.includes("|")) {
    return specs
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => {
        const colonIdx = s.indexOf(":");
        if (colonIdx > 0) {
          const key = s.slice(0, colonIdx).trim();
          const value = s.slice(colonIdx + 1).trim();
          const label = t(`dna.${key}`);
          return { label: label !== `dna.${key}` ? label : specLabel, value };
        }
        return { label: specLabel, value: s };
      })
      .filter((item) => item.value.length > 0);
  }

  // 旧格式：逗号分隔的纯值
  return specs
    .split(/[，,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({ label: specLabel, value: s }));
}

function countConfirmedFields(item: RequirementRow): number {
  const dna = item.fabricDna;
  if (!dna) return 0;
  return DNA_FIELD_KEYS.filter((key) => dna[key].status === "confirmed").length;
}

export default function SquareDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const id = params.id as string;

  const [item, setItem] = useState<RequirementRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchDetail() {
      try {
        const resp = await fetch(
          `/api/bunana/requirements?id=${encodeURIComponent(id)}`
        );
        const data = await resp.json();
        if (cancelled) return;
        if (!data.success || !data.requirement) {
          setError(data.error ?? t("squareDetail.notFound"));
          return;
        }
        setItem(data.requirement);
      } catch (e) {
        if (!cancelled) setError(t("squareDetail.networkError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDemandIntent = () => {
    if (!item) return;
    router.push(`/chat/${item.id}?role=buyer`);
  };

  const handleSupplyIntent = () => {
    if (!item) return;
    router.push(`/chat/${item.id}?role=supplier`);
  };

  const isSeeking = item ? item.postType === "seeking" : true;

  if (loading) {
    return (
      <main className={styles.detailPage}>
        <p className={styles.loading}>{t("squareDetail.loading")}</p>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className={styles.detailPage}>
        <div className="error-banner">{error || t("squareDetail.recordNotExist")}</div>
        <Link
          href="/square"
          className={styles.detailBack}
          style={{ marginTop: 16 }}
        >
          {t("squareDetail.backToDatabase")}
        </Link>
      </main>
    );
  }

  const specsGrid = parseSpecsIntoGrid(item.specs, t("squareDetail.specLabel"), t);
  const confirmedCount = countConfirmedFields(item);

  return (
    <main className={styles.detailPage}>
      <Link href="/square" className={styles.detailBack}>
        {t("squareDetail.backToDatabase")}
      </Link>

      <div className={styles.detailCard}>
        {/* Image — full width */}
        {item.images.length > 0 ? (
          <div className={styles.detailImage}>
            <img
              src={item.images[0].url}
              alt={item.fabricName}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className={styles.detailImage}>
            <div
              style={{
                width: "100%",
                height: "100%",
                background:
                  "linear-gradient(135deg, var(--color-surface) 0%, var(--color-brand-50) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "4rem",
                opacity: 0.2,
              }}
            >
              🧵
            </div>
          </div>
        )}

        <div className={styles.detailBody}>
          {/* Header: name + postType badge (top-left intent + DNA tag right) */}
          <div className={styles.detailHeader}>
            <h1 className={styles.detailName}>
              {item.fabricName || t("squareDetail.unnamedFabric")}
            </h1>
            <div className={styles.detailHeaderRight}>
              <span
                className={`${styles.detailPostTypeBadge} ${
                  isSeeking ? styles.detailPostTypeSeeking : styles.detailPostTypeOffering
                }`}
              >
                {t(isSeeking ? "squareDetail.postTypeSeeking" : "squareDetail.postTypeOffering")}
              </span>
              <span className={styles.detailDnaBadge}>{t("dnaCard.title")}</span>
            </div>
          </div>

          {/* Meta: provider + confirmed count */}
          <div className={styles.detailMeta}>
            <span className={styles.detailProvider}>{item.aiProvider}</span>
            <span className={styles.detailConfirmed}>
              {t("squareDetail.aiConfirmed", { n: confirmedCount })}
            </span>
          </div>

          {/* Keywords */}
          {item.keywords.length > 0 && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>{t("squareDetail.tags")}</h2>
              <div className={styles.detailKeywords}>
                {item.keywords.map((kw) => (
                  <span key={kw} className={styles.detailKeyword}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Specs — 2-column grid (14 字段) */}
          {specsGrid.length > 0 && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>{t("squareDetail.specs")}</h2>
              <div className={styles.specsGrid}>
                {specsGrid.map((spec, i) => (
                  <div key={i} className={styles.specItem}>
                    <span className={styles.specLabel}>{spec.label}</span>
                    <span className={styles.specValue}>{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {item.summary && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>{t("squareDetail.summary")}</h2>
              <p className={styles.detailSummary}>{item.summary}</p>
            </div>
          )}

          {/* Date */}
          <div className={styles.detailDate}>
            {item.createdAt
              ? `${t("squareDetail.publishedAt")} ${new Date(item.createdAt).toLocaleString(LOCALE_TO_DATE[locale])}`
              : ""}
          </div>
        </div>
      </div>

      <div className={styles.detailActions}>
        <button
          className={styles.detailNeedBtn}
          onClick={handleDemandIntent}
        >
          {t("squareDetail.replyForOffering")}
        </button>
        <button
          className={styles.detailHaveBtn}
          onClick={handleSupplyIntent}
        >
          {t("squareDetail.replyForSeeking")}
        </button>
      </div>
    </main>
  );
}
