"use client";

import { useState, useCallback } from "react";
import type {
  ImagePayload,
  FabricDNA,
  FollowUpQuestion,
  DemandEvidence
} from "@/app/types";

export type AnalyzeState = {
  loading: boolean;
  error: string;
  dna: FabricDNA | null;
  followUpQuestions: FollowUpQuestion[];
  evidence: DemandEvidence | null;
  aiProvider: string;
};

export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>({
    loading: false,
    error: "",
    dna: null,
    followUpQuestions: [],
    evidence: null,
    aiProvider: ""
  });

  const analyze = useCallback(async (text: string, images: ImagePayload[]) => {
    if (!text.trim() && images.length === 0) {
      setState((prev) => ({
        ...prev,
        error: "请提供文字需求或上传图片。"
      }));
      return false;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: "",
      dna: null,
      followUpQuestions: [],
      evidence: null,
      aiProvider: ""
    }));

    try {
      const res = await fetch("/api/bunana/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "initial" as const,
          text: text.trim(),
          images
        })
      });

      const data = await res.json();

      if (!data.success) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: data.error || "分析失败，请重试。"
        }));
        return false;
      }

      setState({
        loading: false,
        error: "",
        dna: data.dna ?? null,
        followUpQuestions: data.followUpQuestions ?? [],
        evidence: data.evidence ?? null,
        aiProvider: data.aiProvider ?? ""
      });

      return true;
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "网络错误，请检查连接后重试。"
      }));
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: "",
      dna: null,
      followUpQuestions: [],
      evidence: null,
      aiProvider: ""
    });
  }, []);

  return { ...state, analyze, reset };
}
