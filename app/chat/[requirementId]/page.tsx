"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { RequirementRow } from "@/app/lib/supabase/requirements";
import type { Conversation, Message } from "@/app/lib/supabase/conversations";
import { apiGet, apiPost, apiPut } from "@/app/lib/api-client";
import { parseSpecsValues } from "@/app/lib/dna";
import { useI18n, LOCALE_TO_DATE } from "@/app/i18n";
import styles from "../chat.module.css";

type ChatRole = "buyer" | "supplier";

type ChatInitResponse = {
  success: boolean;
  conversation?: Conversation;
  messages?: Message[];
  token?: string;
  role?: ChatRole;
  error?: string;
};

const pendingCreates = new Map<string, Promise<ChatInitResponse>>();

function createConversationOnce(
  requirementId: string,
  intent: ChatRole
): Promise<ChatInitResponse> {
  const key = `${requirementId}:${intent}`;
  const existing = pendingCreates.get(key);
  if (existing) return existing;
  const request = apiPost<ChatInitResponse>("/api/bunana/conversations", {
    action: "create",
    requirementId,
    intent,
  });
  pendingCreates.set(key, request);
  request.finally(() => pendingCreates.delete(key));
  return request;
}

function parseSpecsBrief(specs: string): string[] {
  return parseSpecsValues(specs).slice(0, 6);
}

function getRoleLabel(role: string, t: (path: string) => string): string {
  if (role === "buyer") return t("chat.roleBuyer");
  if (role === "supplier") return t("chat.roleSupplier");
  return t("chat.roleSystem");
}

function formatTime(iso: string, dateLocale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const requirementId = params.requirementId as string;
  const intent = (searchParams.get("intent") ?? searchParams.get("role") ?? "buyer") as ChatRole;
  const requestedConversationId = searchParams.get("conversation") ?? "";

  const [requirement, setRequirement] = useState<RequirementRow | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [participantToken, setParticipantToken] = useState("");
  const [participantRole, setParticipantRole] = useState<ChatRole | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const reqData = await apiGet<{
          success: boolean;
          requirement: RequirementRow | null;
          error?: string;
        }>(`/api/bunana/requirements?id=${encodeURIComponent(requirementId)}`);
        if (cancelled) return;
        if (!reqData.success || !reqData.requirement) {
          setError(t("chat.notExist"));
          return;
        }
        setRequirement(reqData.requirement);

        const storedToken = requestedConversationId
          ? localStorage.getItem(`bunana-chat-token:${requestedConversationId}`) ?? ""
          : "";
        const action = requestedConversationId
          ? (storedToken ? "read" : "claim")
          : "create";
        const chatData = action === "create"
          ? await createConversationOnce(requirementId, intent)
          : await apiPost<ChatInitResponse>("/api/bunana/conversations", {
              action,
              requirementId,
              conversationId: requestedConversationId,
              intent,
              token: storedToken,
            });
        if (cancelled) return;
        if (!chatData.success || !chatData.conversation) {
          setError(chatData.error ?? t("chat.initFailed"));
          return;
        }

        const resolvedToken = chatData.token ?? storedToken;
        if (!resolvedToken) {
          setError("Unauthorized");
          return;
        }
        localStorage.setItem(
          `bunana-chat-token:${chatData.conversation.id}`,
          resolvedToken
        );
        setConversation(chatData.conversation);
        setMessages(chatData.messages ?? []);
        setParticipantToken(resolvedToken);
        setParticipantRole(chatData.role ?? null);
        if (!requestedConversationId) {
          const joinIntent: ChatRole = intent === "buyer" ? "supplier" : "buyer";
          router.replace(
            `/chat/${requirementId}?conversation=${encodeURIComponent(chatData.conversation.id)}&intent=${joinIntent}`
          );
        }
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
  }, [intent, requestedConversationId, requirementId, router, t]);

  useEffect(() => {
    if (!conversation || !participantToken) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await apiPost<{
          success: boolean;
          messages?: Message[];
        }>("/api/bunana/conversations", {
          action: "read",
          requirementId,
          conversationId: conversation.id,
          token: participantToken,
        });
        if (!cancelled && data.success) {
          setMessages(data.messages ?? []);
        }
      } catch {
        // A transient polling failure is retried on the next interval.
      }
    };
    const timer = window.setInterval(poll, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [conversation, participantToken, requirementId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || text.length > 5000 || !conversation || !participantToken || sending) return;

    setSending(true);
    setInput("");
    try {
      const data = await apiPut<{
        success: boolean;
        messages?: Message[];
        error?: string;
      }>("/api/bunana/conversations", {
        conversationId: conversation.id,
        token: participantToken,
        content: text,
      });
      if (!data.success) {
        setError(data.error ?? t("chat.sendFailed"));
        setInput(text);
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
  }, [conversation, input, participantToken, sending, t]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (loading) {
    return <main className={styles.chatPage}><div className={styles.chatLoading}><span>{t("chat.entering")}</span></div></main>;
  }

  if (error && (!requirement || !conversation)) {
    return (
      <main className={styles.chatPage}>
        <div className={styles.chatError}>
          <div className="error-banner">{error}</div>
          <Link href="/square" className="btn-weave-outline">{t("chat.backToSquare")}</Link>
        </div>
      </main>
    );
  }

  const specsBrief = requirement ? parseSpecsBrief(requirement.specs) : [];

  return (
    <main className={styles.chatPage}>
      <header className={styles.chatHeader}>
        <Link href={`/square/${requirementId}`} className={styles.chatBack}>{t("chat.backToDetail")}</Link>
        <div className={styles.chatDnaBar}>
          <span className={styles.chatDnaBadge}>{t("dnaCard.title")}</span>
          <h1 className={styles.chatFabricName}>{requirement?.fabricName || t("chat.unnamedFabric")}</h1>
        </div>
        {specsBrief.length > 0 && (
          <div className={styles.chatDnaSpecs}>
            {specsBrief.map((spec, index) => <span key={index} className={styles.chatDnaSpec}>{spec}</span>)}
          </div>
        )}
      </header>

      <div className={styles.chatMessages}>
        {messages.length === 0 && <p className={styles.chatEmpty}>{t("chat.emptyMessages")}</p>}
        {messages.map((message) => {
          const messageSide = message.sender === "system"
            ? ""
            : message.sender === participantRole
              ? styles.own
              : styles.other;
          return (
            <div key={message.id} className={`${styles.msgRow} ${styles[message.sender] || ""} ${messageSide}`}>
              {message.sender !== "system" && <span className={styles.msgSender}>{getRoleLabel(message.sender, t)}</span>}
              <div className={styles.msgBubble}>{message.content}</div>
              <span className={styles.msgMeta}>{formatTime(message.createdAt, LOCALE_TO_DATE[locale])}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className={styles.chatInputArea}>
        <input
          ref={inputRef}
          type="text"
          className={styles.chatInput}
          placeholder={t("chat.inputPlaceholder")}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          maxLength={5000}
          autoFocus
        />
        <button className={styles.chatSendBtn} onClick={handleSend} disabled={!input.trim() || sending}>
          {sending ? t("chat.sending") : t("chat.send")}
        </button>
      </div>
    </main>
  );
}
