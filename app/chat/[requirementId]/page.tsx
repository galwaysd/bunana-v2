"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import type { RequirementRow } from "@/app/lib/supabase/requirements";
import type { Conversation, Message } from "@/app/lib/supabase/conversations";
import styles from "../chat.module.css";

type ChatRole = "buyer" | "supplier";

/* ---- 从 specs 解析精简规格 ---- */
function parseSpecsBrief(specs: string): string[] {
  if (!specs || specs === "待确认") return [];
  return specs
    .split(/[，,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 6);
}

/* ---- 角色标签 ---- */
const ROLE_LABELS: Record<string, string> = {
  buyer: "需求方",
  supplier: "供应方",
  system: "系统",
};

/* ---- 格式化时间 ---- */
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
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
        const reqResp = await fetch(
          `/api/bunana/requirements?id=${encodeURIComponent(requirementId)}`
        );
        const reqData = await reqResp.json();
        if (cancelled) return;
        if (!reqData.success || !reqData.requirement) {
          setError("该需求记录不存在。");
          setLoading(false);
          return;
        }
        setRequirement(reqData.requirement);

        // 初始化聊天
        const chatResp = await fetch("/api/bunana/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requirementId, role }),
        });
        const chatData = await chatResp.json();
        if (cancelled) return;
        if (!chatData.success) {
          setError(chatData.error ?? "初始化聊天失败。");
          setLoading(false);
          return;
        }
        setConversation(chatData.conversation);
        setMessages(chatData.messages ?? []);
      } catch {
        if (!cancelled) setError("网络错误。");
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
      const resp = await fetch("/api/bunana/conversations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          sender: role,
          content: text,
        }),
      });
      const data = await resp.json();
      if (!data.success) {
        setError(data.error ?? "发送失败。");
        setInput(text); // 恢复输入
        return;
      }
      setMessages(data.messages ?? []);
      setError("");
    } catch {
      setError("发送消息失败。");
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
          <span>正在进入聊天...</span>
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
            ← 返回布市场
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
          ← 返回面料详情
        </Link>
        <div className={styles.chatDnaBar}>
          <span className={styles.chatDnaBadge}>FABRIC DNA</span>
          <h1 className={styles.chatFabricName}>
            {requirement?.fabricName || "未命名面料"}
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
          <p className={styles.chatEmpty}>暂无消息。开始对话吧。</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.msgRow} ${styles[msg.sender] || ""}`}
          >
            {msg.sender !== "system" && (
              <span className={styles.msgSender}>
                {ROLE_LABELS[msg.sender] || msg.sender}
              </span>
            )}
            <div className={styles.msgBubble}>{msg.content}</div>
            <span className={styles.msgMeta}>
              {formatTime(msg.createdAt)}
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
          placeholder="输入消息..."
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
          {sending ? "发送中" : "发送"}
        </button>
      </div>
    </main>
  );
}
