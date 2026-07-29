"use client";

import { useState, useCallback } from "react";
import type { FabricDNA, FollowUpQuestion } from "@/app/types";

export type FollowUpState = {
  submitting: boolean;
  error: string;
};

export function useFollowUp() {
  const [state, setState] = useState<FollowUpState>({
    submitting: false,
    error: ""
  });

  const refine = useCallback(
    async (
      currentDNA: FabricDNA,
      question: FollowUpQuestion,
      answer: string,
      answeredLog: Record<string, string>
    ): Promise<{
      dna: FabricDNA;
      followUpQuestions: FollowUpQuestion[];
      answeredLog: Record<string, string>;
    } | null> => {
      setState({ submitting: true, error: "" });

      try {
        const res = await fetch("/api/bunana/analyze", {
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

        const data = await res.json();

        if (!data.success) {
          setState({
            submitting: false,
            error: data.error || "更新失败，请重试。"
          });
          return null;
        }

        const newLog = { ...answeredLog, [question.field]: answer };

        setState({ submitting: false, error: "" });

        return {
          dna: data.dna ?? currentDNA,
          followUpQuestions: data.followUpQuestions ?? [],
          answeredLog: newLog
        };
      } catch {
        setState({
          submitting: false,
          error: "网络错误，请检查连接后重试。"
        });
        return null;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: "" }));
  }, []);

  return { ...state, refine, clearError };
}
