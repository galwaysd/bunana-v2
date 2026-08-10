"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { RequirementRow } from "@/app/lib/supabase/requirements";
import styles from "../square.module.css";

/* ----- 从 specs 中解析 14 字段规格项 ----- */
function parseSpecsIntoGrid(specs: string): { label: string; value: string }[] {
  if (!specs || specs === "待确认") return [];
  return specs
    .split(/[，,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({ label: s.length > 6 ? s.slice(0, 6) : "规格", value: s }));
}

function estimateConfirmedCount(item: RequirementRow): number {
  const meaningfulKeywords = item.keywords.filter(
    (kw) => kw !== item.fabricName && kw.length > 0
  );
  const specParts =
    item.specs && item.specs !== "待确认"
      ? item.specs.split(/[，,、]/).filter((s) => s.trim().length > 0)
      : [];
  return meaningfulKeywords.length + specParts.length;
}

export default function SquareDetailPage() {
  const params = useParams();
  const router = useRouter();
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
          setError(data.error ?? "未找到该记录。");
          return;
        }
        setItem(data.requirement);
      } catch (e) {
        if (!cancelled) setError("网络错误，加载失败。");
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

  if (loading) {
    return (
      <main className={styles.detailPage}>
        <p className={styles.loading}>加载中...</p>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className={styles.detailPage}>
        <div className="error-banner">{error || "记录不存在"}</div>
        <Link
          href="/square"
          className={styles.detailBack}
          style={{ marginTop: 16 }}
        >
          ← 返回 Fabric DNA 数据库
        </Link>
      </main>
    );
  }

  const specsGrid = parseSpecsIntoGrid(item.specs);
  const confirmedCount = estimateConfirmedCount(item);

  return (
    <main className={styles.detailPage}>
      <Link href="/square" className={styles.detailBack}>
        ← 返回 Fabric DNA 数据库
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
          {/* Header: name + DNA badge */}
          <div className={styles.detailHeader}>
            <h1 className={styles.detailName}>
              {item.fabricName || "未命名面料"}
            </h1>
            <span className={styles.detailDnaBadge}>FABRIC DNA</span>
          </div>

          {/* Meta: provider + confirmed count */}
          <div className={styles.detailMeta}>
            <span className={styles.detailProvider}>{item.aiProvider}</span>
            <span className={styles.detailConfirmed}>
              AI 已确认 {confirmedCount} 项
            </span>
          </div>

          {/* Keywords */}
          {item.keywords.length > 0 && (
            <div className={styles.detailSection}>
              <h2 className={styles.detailSectionTitle}>标签</h2>
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
              <h2 className={styles.detailSectionTitle}>规格参数</h2>
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
              <h2 className={styles.detailSectionTitle}>摘要</h2>
              <p className={styles.detailSummary}>{item.summary}</p>
            </div>
          )}

          {/* Date */}
          <div className={styles.detailDate}>
            {item.createdAt
              ? `发布于 ${new Date(item.createdAt).toLocaleString("zh-CN")}`
              : ""}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.detailActions}>
        <button
          className={styles.detailNeedBtn}
          onClick={handleDemandIntent}
        >
          我需要这个面料
        </button>
        <button
          className={styles.detailHaveBtn}
          onClick={handleSupplyIntent}
        >
          我有这个面料
        </button>
      </div>
    </main>
  );
}
