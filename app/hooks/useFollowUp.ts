"use client";

import { useState, useCallback, useRef } from "react";
import type { FabricDNA, FollowUpQuestion } from "@/app/types";

export type FollowUpState = {
  submitting: boolean;
  error: string;
};

type RefineResult = {
  dna: FabricDNA;
  followUpQuestions: FollowUpQuestion[];
  answeredLog: Record<string, string>;
} | null;

type RefineResponsePayload = {
  success?: boolean;
  error?: string;
  dna?: FabricDNA;
  followUpQuestions?: FollowUpQuestion[];
};

function isFabricDNA(value: unknown): value is FabricDNA {
  if (!value || typeof value !== "object") return false;
  const dna = value as Partial<FabricDNA>;
  return Boolean(
    dna.fabricName &&
    typeof dna.fabricName.value === "string" &&
    dna.use &&
    typeof dna.use.value === "string"
  );
}

export function useFollowUp() {
  const requestInFlight = useRef<Promise<RefineResult> | null>(null);
  const [state, setState] = useState<FollowUpState>({
    submitting: false,
    error: ""
  });

  const refine = useCallback(
    (
      currentDNA: FabricDNA,
      question: FollowUpQuestion,
      answer: string,
      answeredLog: Record<string, string>
    ): Promise<RefineResult> => {
      if (requestInFlight.current) return requestInFlight.current;

      const request = (async (): Promise<RefineResult> => {
        setState({ submitting: true, error: "" });

        let res: Response;
        try {
          res = await fetch("/api/bunana/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "refine",
              currentDNA,
              question,
              answer,
              answeredLog
            })
          });
        } catch (error) {
          console.error("Refine connection failed:", error);
          setState({
            submitting: false,
            error: "无法连接服务器，请确认本地服务仍在运行。"
          });
          return null;
        }

        let responseText: string;
        try {
          responseText = await res.text();
        } catch (error) {
          console.error("Refine response read failed:", error);
          setState({
            submitting: false,
            error: "无法连接服务器：响应传输中断。"
          });
          return null;
        }

        let data: RefineResponsePayload;
        try {
          data = JSON.parse(responseText) as RefineResponsePayload;
        } catch (error) {
          console.error("Refine response JSON invalid:", {
            status: res.status,
            responseText,
            error
          });
          setState({
            submitting: false,
            error: `返回数据格式错误（HTTP ${res.status}）。`
          });
          return null;
        }

        if (!res.ok || data.success !== true) {
          console.error("Refine API returned an error:", {
            status: res.status,
            data
          });
          setState({
            submitting: false,
            error: `接口返回错误（HTTP ${res.status}）：${data.error || "更新失败"}`
          });
          return null;
        }

        if (!isFabricDNA(data.dna) || !Array.isArray(data.followUpQuestions)) {
          console.error("Refine response shape invalid:", {
            status: res.status,
            data
          });
          setState({
            submitting: false,
            error: "返回数据格式错误：缺少有效的 Fabric DNA 或追问列表。"
          });
          return null;
        }

        const newLog = { ...answeredLog, [question.field]: answer };

        setState({ submitting: false, error: "" });

        return {
          dna: data.dna,
          followUpQuestions: data.followUpQuestions,
          answeredLog: newLog
        };
      })();

      requestInFlight.current = request;
      void request.finally(() => {
        if (requestInFlight.current === request) requestInFlight.current = null;
      });
      return request;
    },
    []
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: "" }));
  }, []);

  return { ...state, refine, clearError };
}
