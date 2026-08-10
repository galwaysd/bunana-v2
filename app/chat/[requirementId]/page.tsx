"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { RequirementRow } from "@/app/lib/supabase/requirements";
import type { Conversation, Message } from "@/app/lib/supabase/conversations";
import { apiGet, apiPost, apiPut } from "@/app/lib/api-client";
import { useI18n, LOCALE_TO_DATE } from "@/app/i18n";
import styles from "../chat.module.css";

type ChatRole = "buyer" | "supplier";

/* ---- 从 specs 解析精简规格 ---- */
function parseSpecsBrief(specs: string): string[] {
  if (!specs || specs === "待确认" || specs === "TBD" || specs === "未定" || specs === "미정") return [];
  return specs
    .split(/[，,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 6);
}

/* ---- 角色标签 ---- */
function getRoleLabel(role: string, t: (path: string) => string): string {
  if (role === "buyer") return t("chat.roleBuyer");
  if (role === "supplier") return t("chat.roleSupplier");
  return t("chat.roleSystem");
}

/* ---- 格式化时间 ---- */
function formatTime(iso: string, dateLocale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const requirementId = params.requirementId as string;
  const role = (searchParams.get("role") ?? "buyer") as ChatRole;

  const [requirement, setRequirement] = useState<RequirementRow | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* 初始化：加载需求 + 创建/获取聊天 */
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        // 加载需求详情
        const reqData = await apiGet<{ success: boolean; requirement: RequirementRow | null; error?: string }>(
          `/api/bunana/requirements?id=${encodeURIComponent(requirementId)}`
        );
        if (cancelled) return;
        if (!reqData.success || !reqData.requirement) {
          setError(t("chat.notExist"));
          setLoading(false);
          return;
        }
        setRequirement(reqData.requirement);

        // 初始化聊天
        const chatData = await apiPost<{ success: boolean; conversation?: Conversation; messages?: Message[]; error?: string }>(
          "/api/bunana/conversations",
          { requirementId, role, locale }
        );
        if (cancelled) return;
        if (!chatData.success) {
          setError(chatData.error ?? t("chat.initFailed"));
          setLoading(false);
          return;
        }
        setConversation(chatData.conversation);
        setMessages(chatData.messages ?? []);
      } catch {
        if (!cancelled) setError(t("chat.networkError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [requirementId, role]);

  /* 自动滚动到底部 */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* 发送消息 */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !conversation || sending) return;

    setSending(true);
    setInput("");

    try {
      const data = await apiPut<{ success: boolean; message?: Message; messages?: Message[]; error?: string }>(
        "/api/bunana/conversations",
        {
          conversationId: conversation.id,
          sender: role,
          content: text,
        }
      );
      if (!data.success) {
        setError(data.error ?? t("chat.sendFailed"));
        setInput(text); // 恢复输入
        return;
      }
      setMessages(data.messages ?? []);
      setError("");
    } catch {
      setError(t("chat.sendError"));
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, conversation, sending, role]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  /* ---- Loading ---- */
  if (loading) {
    return (
      <main className={styles.chatPage}>
        <div className={styles.chatLoading}>
          <span>{t("chat.entering")}</span>
        </div>
      </main>
    );
  }

  /* ---- Error ---- */
  if (error && !requirement) {
    return (
      <main className={styles.chatPage}>
        <div className={styles.chatError}>
          <div className="error-banner">{error}</div>
          <Link href="/square" className="btn-weave-outline">
            {t("chat.backToSquare")}
          </Link>
        </div>
      </main>
    );
  }

  const specsBrief = requirement ? parseSpecsBrief(requirement.specs) : [];

  return (
    <main className={styles.chatPage}>
      {/* Header: Fabric DNA 摘要 */}
      <header className={styles.chatHeader}>
        <Link href={`/square/${requirementId}`} className={styles.chatBack}>
          {t("chat.backToDetail")}
        </Link>
        <div className={styles.chatDnaBar}>
          <span className={styles.chatDnaBadge}>{t("dnaCard.title")}</span>
          <h1 className={styles.chatFabricName}>
            {requirement?.fabricName || t("chat.unnamedFabric")}
          </h1>
        </div>
        {specsBrief.length > 0 && (
          <div className={styles.chatDnaSpecs}>
            {specsBrief.map((s, i) => (
              <span key={i} className={styles.chatDnaSpec}>
                {s}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Messages */}
      <div className={styles.chatMessages}>
        {messages.length === 0 && (
          <p className={styles.chatEmpty}>{t("chat.emptyMessages")}</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.msgRow} ${styles[msg.sender] || ""}`}
          >
            {msg.sender !== "system" && (
              <span className={styles.msgSender}>
                {getRoleLabel(msg.sender, t)}
              </span>
            )}
            <div className={styles.msgBubble}>{msg.content}</div>
            <span className={styles.msgMeta}>
              {formatTime(msg.createdAt, LOCALE_TO_DATE[locale])}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && <div className="error-banner">{error}</div>}

      {/* Input */}
      <div className={styles.chatInputArea}>
        <input
          ref={inputRef}
          type="text"
          className={styles.chatInput}
          placeholder={t("chat.inputPlaceholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          autoFocus
        />
        <button
          className={styles.chatSendBtn}
          onClick={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending ? t("chat.sending") : t("chat.send")}
        </button>
      </div>
    </main>
  );
}
