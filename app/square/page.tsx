"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Requirement = {
  id: string;
  fabricName: string;
  specs: string;
  summary: string;
  category: string;
  keywords: string[];
  images: Array<{ id: string; url: string; originalName: string }>;
  aiProvider: string;
  createdAt: string;
};

export default function SquarePage() {
  const [items, setItems] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    return () => { cancelled = true; };
  }, []);

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.35rem", color: "#333", margin: "0 0 0.25rem" }}>
            Bunana 广场
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#999", margin: 0 }}>
            最近发布的面料需求
          </p>
        </div>
        <Link
          href="/"
          style={{
            fontSize: "0.85rem",
            color: "#1565c0",
            textDecoration: "none",
            padding: "0.4rem 0.75rem",
            border: "1px solid #1565c0",
            borderRadius: "6px",
          }}
        >
          ← 返回
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "#fff0f0",
            border: "1px solid #ffcdd2",
            color: "#c62828",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p style={{ textAlign: "center", color: "#999", padding: "2rem 0" }}>
          加载中...
        </p>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <p style={{ textAlign: "center", color: "#999", padding: "2rem 0" }}>
          暂无发布。回首页创建一份 Fabric DNA 吧。
        </p>
      )}

      {/* List */}
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "12px",
            background: "#fff",
            padding: "1rem 1.25rem",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "0.4rem",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#333" }}>
              {item.fabricName || "未命名面料"}
            </h3>
            <span
              style={{
                fontSize: "0.7rem",
                color: "#999",
                background: "#f5f5f5",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              {item.aiProvider}
            </span>
          </div>

          {item.specs && (
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#555" }}>
              {item.specs}
            </p>
          )}

          {item.summary && (
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "#777" }}>
              {item.summary}
            </p>
          )}

          {item.images.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              {item.images.slice(0, 3).map((img) => (
                <div
                  key={img.id}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#f0f0f0",
                    border: "1px solid #eee",
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.originalName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.7rem",
              color: "#bbb",
            }}
          >
            {item.createdAt
              ? new Date(item.createdAt).toLocaleString("zh-CN")
              : ""}
          </div>
        </div>
      ))}
    </main>
  );
}
