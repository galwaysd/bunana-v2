"use client";

import { FormEvent, useState } from "react";
import styles from "./enter.module.css";

type AccessResponse = {
  success?: boolean;
  error?: string;
  returnTo?: string;
};

export default function EnterPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/bunana/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          code,
          returnTo:
            new URLSearchParams(window.location.search).get("returnTo") ?? "/",
        }),
      });
      const data = (await response.json()) as AccessResponse;

      if (!response.ok || data.success !== true) {
        setError(data.error || "暂时无法进入，请稍后重试。");
        return;
      }

      window.location.replace(data.returnTo || "/");
    } catch {
      setError("暂时无法进入，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="enter-title">
        <p className={styles.eyebrow}>BUNANA 小范围测试</p>
        <h1 id="enter-title">输入测试访问口令</h1>
        <p className={styles.description}>
          首次使用 AI 分析或发布前请输入邀请口令。验证后 7 天内无需重复输入。
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="access-code">测试访问口令</label>
          <input
            id="access-code"
            name="access-code"
            type="password"
            autoComplete="current-password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={submitting}
            required
            autoFocus
          />
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={submitting || !code.trim()}>
            {submitting ? "验证中…" : "进入小布"}
          </button>
        </form>
      </section>
    </main>
  );
}
