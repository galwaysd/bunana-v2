"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RequirementRow } from "@/app/lib/supabase/requirements";
import styles from "./square.module.css";

/* ----- 筛选分类定义 ----- */
const FILTER_CATEGORIES = [
  { key: "composition" as const, label: "材质" },
  { key: "use" as const, label: "用途" },
  { key: "features" as const, label: "特性" },
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
  // specs 格式: "600D，尼龙，幅宽150cm，PU800，黑色"
  return specs
    .split(/[，,、]/)
    .map((s) => s.trim())
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
  const specParts = item.specs && item.specs !== "待确认"
    ? item.specs.split(/[，,、]/).filter((s) => s.trim().length > 0)
    : [];
  return meaningfulKeywords.length + specParts.length;
}

export default function SquarePage() {
  const router = useRouter();
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
          setError(data.error ?? "加载广场失败。");
          return;
        }
        setItems(data.requirements ?? []);
      } catch (e) {
        if (!cancelled) setError("网络错误，加载失败。");
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
          <h1 className={styles.squareTitle}>Fabric DNA 数据库</h1>
          <p className={styles.squareSubtitle}>
            已构建的面料身份档案
          </p>
        </div>
        <Link href="/" className="btn-weave-outline">
          ← 返回工作台
        </Link>
      </header>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        {FILTER_CATEGORIES.map((cat) => (
          <div key={cat.key} className={styles.filterGroup}>
            <span className={styles.filterLabel}>{cat.label}</span>
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
              清除筛选
            </button>
            <span className={styles.filterCount}>
              {filteredItems.length} 条结果
            </span>
          </>
        )}
      </div>

      {/* States */}
      {error && <div className="error-banner">{error}</div>}
      {loading && <p className={styles.loading}>加载中...</p>}
      {!loading && !error && filteredItems.length === 0 && (
        <p className={styles.empty}>
          {hasActiveFilters
            ? "没有匹配的面料档案，试试调整筛选条件。"
            : "暂无 Fabric DNA 档案。回首页创建一份吧。"}
        </p>
      )}

      {/* Card Grid */}
      <div className={styles.squareGrid}>
        {filteredItems.map((item) => {
          const useLabel = extractUseFromKeywords(item.keywords, item.fabricName);
          const features = extractFeaturesFromSpecs(item.specs);

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
                  <span className={styles.cardDnaBadge}>FABRIC DNA</span>
                </div>
              ) : (
                <div className={styles.cardImagePlaceholder}>
                  <span className={styles.cardPlaceholderIcon}>🧵</span>
                  <span className={styles.cardDnaBadge}>FABRIC DNA</span>
                </div>
              )}

              <div className={styles.cardBody}>
                {/* Fabric name */}
                <h3 className={styles.cardName}>
                  {item.fabricName || "未命名面料"}
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

                {/* Footer: action buttons */}
                <div className={styles.cardFooter}>
                  <button
                    className={styles.cardNeedBtn}
                    onClick={(e) => goChat(e, item.id, "buyer")}
                  >
                    我需要这个面料
                  </button>
                  <button
                    className={styles.cardHaveBtn}
                    onClick={(e) => goChat(e, item.id, "supplier")}
                  >
                    我有这个面料
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
