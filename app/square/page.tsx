"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RequirementRow } from "@/app/lib/supabase/requirements";
import { parseSpecsValues } from "@/app/lib/dna";
import { useI18n } from "@/app/i18n";
import styles from "./square.module.css";

/* ----- 筛选分类定义 ----- */
const FILTER_CATEGORIES = [
  { key: "composition" as const, labelKey: "square.filterComposition" },
  { key: "use" as const, labelKey: "square.filterUse" },
  { key: "features" as const, labelKey: "square.filterFeatures" },
] as const;

type FilterKey = (typeof FILTER_CATEGORIES)[number]["key"];

/* ----- 从数据中提取过滤选项 ----- */
function extractFilterOptions(
  items: RequirementRow[]
): Record<FilterKey, string[]> {
  const extracted: Record<FilterKey, Set<string>> = {
    composition: new Set(),
    use: new Set(),
    features: new Set(),
  };

  const compositionWords = [
    "涤纶", "尼龙", "棉", "棉涤", "锦纶", "氨纶", "涤棉",
    "聚酯", "牛津布", "春亚纺", "涤塔夫", "尼丝纺",
  ];
  const useWords = [
    "背包", "服装", "帐篷", "箱包", "户外", "家纺", "雨伞",
    "鞋材", "运动", "行军", "旅行", "登山",
  ];
  const featureWords = [
    "防水", "阻燃", "抗UV", "防静电", "耐磨", "透气",
    "PU涂层", "PA涂层", "PVC涂层", "防泼水", "轻量", "柔软",
  ];

  for (const item of items) {
    const searchText = `${item.fabricName} ${item.specs} ${item.summary} ${item.keywords.join(" ")} ${item.category}`;

    for (const w of compositionWords) {
      if (searchText.includes(w)) extracted.composition.add(w);
    }
    for (const w of useWords) {
      if (searchText.includes(w)) extracted.use.add(w);
    }
    for (const w of featureWords) {
      if (searchText.includes(w)) extracted.features.add(w);
    }
  }

  return {
    composition: [...extracted.composition].slice(0, 8),
    use: [...extracted.use].slice(0, 8),
    features: [...extracted.features].slice(0, 8),
  };
}

/* ----- 从 keywords 中提取用途（keywords[1] 通常是 use.value）----- */
function extractUseFromKeywords(
  keywords: string[],
  fabricName: string
): string {
  // 跳过第一个 keyword（fabricName），取第二个作为用途
  for (const kw of keywords) {
    if (kw !== fabricName && kw.length <= 10) return kw;
  }
  return "";
}

/* ----- 从 specs 中提取核心特性 ----- */
function extractFeaturesFromSpecs(specs: string): string[] {
  if (!specs || specs === "待确认") return [];
  return parseSpecsValues(specs)
    .filter((s) => s.length > 0 && s.length <= 12)
    .slice(0, 4);
}

/* ----- 估算 AI 确认字段数 ----- */
function estimateConfirmedCount(item: RequirementRow): number {
  // 有意义的 keywords（剔除 fabricName 自身）
  const meaningfulKeywords = item.keywords.filter(
    (kw) => kw !== item.fabricName && kw.length > 0
  );
  // specs 中有值的字段
  const specParts = parseSpecsValues(item.specs);
  return meaningfulKeywords.length + specParts.length;
}

export default function SquarePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [items, setItems] = useState<RequirementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilters, setActiveFilters] = useState<
    Record<FilterKey, string | null>
  >({ composition: null, use: null, features: null });

  /* 加载广场数据 */
  useEffect(() => {
    let cancelled = false;
    async function fetchSquare() {
      try {
        const resp = await fetch("/api/bunana/requirements");
        const data = await resp.json();
        if (cancelled) return;
        if (!data.success) {
          setError(data.error ?? t("square.loadFailed"));
          return;
        }
        setItems(data.requirements ?? []);
      } catch (e) {
        if (!cancelled) setError(t("square.networkError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSquare();
    return () => {
      cancelled = true;
    };
  }, []);

  const filterOptions = useMemo(() => extractFilterOptions(items), [items]);

  /* 按激活筛选条件过滤 */
  const filteredItems = useMemo(() => {
    if (!Object.values(activeFilters).some(Boolean)) return items;
    return items.filter((item) => {
      const searchText = [
        item.fabricName,
        item.specs,
        item.summary,
        ...item.keywords,
        item.category,
      ].join(" ");

      for (const cat of FILTER_CATEGORIES) {
        const val = activeFilters[cat.key];
        if (val && !searchText.includes(val)) return false;
      }
      return true;
    });
  }, [items, activeFilters]);

  const toggleFilter = (category: FilterKey, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [category]: prev[category] === value ? null : value,
    }));
  };

  const clearAllFilters = () => {
    setActiveFilters({ composition: null, use: null, features: null });
  };

  /* 卡片按钮：防止冒泡，跳转聊天 */
  const goChat = (e: React.MouseEvent, itemId: string, role: "buyer" | "supplier") => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/chat/${itemId}?role=${role}`);
  };

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  return (
    <main className={styles.squarePage}>
      {/* Header */}
      <header className={styles.squareHeader}>
        <div>
          <h1 className={styles.squareTitle}>{t("square.title")}</h1>
          <p className={styles.squareSubtitle}>
            {t("square.subtitle")}
          </p>
        </div>
        <Link href="/" className="btn-weave-outline">
          {t("square.backToWorkbench")}
        </Link>
      </header>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        {FILTER_CATEGORIES.map((cat) => (
          <div key={cat.key} className={styles.filterGroup}>
            <span className={styles.filterLabel}>{t(cat.labelKey)}</span>
            {filterOptions[cat.key].map((opt) => (
              <button
                key={opt}
                className={`${styles.filterChip} ${
                  activeFilters[cat.key] === opt
                    ? styles.filterChipActive
                    : ""
                }`}
                onClick={() => toggleFilter(cat.key, opt)}
              >
                {opt}
              </button>
            ))}
            {filterOptions[cat.key].length === 0 && (
              <span className={styles.filterLabel} style={{ opacity: 0.5 }}>
                —
              </span>
            )}
          </div>
        ))}
        {hasActiveFilters && (
          <>
            <button className={styles.filterClear} onClick={clearAllFilters}>
              {t("square.clearFilter")}
            </button>
            <span className={styles.filterCount}>
              {t("square.resultCount", { n: filteredItems.length })}
            </span>
          </>
        )}
      </div>

      {/* States */}
      {error && <div className="error-banner">{error}</div>}
      {loading && <p className={styles.loading}>{t("square.loading")}</p>}
      {!loading && !error && filteredItems.length === 0 && (
        <p className={styles.empty}>
          {hasActiveFilters
            ? t("square.emptyFiltered")
            : t("square.emptyNoData")}
        </p>
      )}

      {/* Card Grid */}
      <div className={styles.squareGrid}>
        {filteredItems.map((item) => {
          const useLabel = extractUseFromKeywords(item.keywords, item.fabricName);
          const features = extractFeaturesFromSpecs(item.specs);
          const isSeeking = item.postType === "seeking";

          return (
            <Link
              key={item.id}
              href={`/square/${item.id}`}
              className={styles.squareCard}
            >
              {/* Image first */}
              {item.images.length > 0 ? (
                <div className={styles.cardImage}>
                  <img
                    src={item.images[0].url}
                    alt={item.fabricName}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {/* Top-left: Post Type (找布 / 有布) */}
                  <span
                    className={`${styles.cardPostTypeBadge} ${
                      isSeeking ? styles.cardPostTypeSeeking : styles.cardPostTypeOffering
                    }`}
                  >
                    {t(isSeeking ? "square.postTypeSeeking" : "square.postTypeOffering")}
                  </span>
                  {/* Top-right: FABRIC DNA */}
                  <span className={styles.cardDnaBadge}>{t("dnaCard.title")}</span>
                </div>
              ) : (
                <div className={styles.cardImagePlaceholder}>
                  <span className={styles.cardPlaceholderIcon}>🧵</span>
                  {/* Top-left: Post Type (找布 / 有布) */}
                  <span
                    className={`${styles.cardPostTypeBadge} ${
                      isSeeking ? styles.cardPostTypeSeeking : styles.cardPostTypeOffering
                    }`}
                  >
                    {t(isSeeking ? "square.postTypeSeeking" : "square.postTypeOffering")}
                  </span>
                </div>
              )}

              <div className={styles.cardBody}>
                {/* Fabric name */}
                <h3 className={styles.cardName}>
                  {item.fabricName || t("square.unnamedFabric")}
                </h3>

                {/* Use */}
                {useLabel && (
                  <span className={styles.cardUse}>{useLabel}</span>
                )}

                {/* Core features */}
                {features.length > 0 && (
                  <div className={styles.cardFeatures}>
                    {features.map((f) => (
                      <span key={f} className={styles.cardFeature}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer: single reply button based on postType
                    - 发布者找布（seeking）→ 看的人点"我有这个面料"来供货（supplier）
                    - 发布者有布（offering）→ 看的人点"我需要这个面料"来求购（buyer）
                */}
                <div className={styles.cardFooter}>
                  <button
                    className={styles.cardNeedBtn}
                    onClick={(e) => goChat(e, item.id, "buyer")}
                  >
                    {t("square.replyForOffering")}
                  </button>
                  <button
                    className={styles.cardHaveBtn}
                    onClick={(e) => goChat(e, item.id, "supplier")}
                  >
                    {t("square.replyForSeeking")}
                  </button>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
