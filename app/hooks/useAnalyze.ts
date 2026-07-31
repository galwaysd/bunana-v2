"use client";

import { useState, useCallback, useRef } from "react";
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

type AnalyzeResult =
  | { dna: FabricDNA; followUpQuestions: FollowUpQuestion[] }
  | false;

export function useAnalyze() {
  const requestInFlight = useRef<Promise<AnalyzeResult> | null>(null);
  const [state, setState] = useState<AnalyzeState>({
    loading: false,
    error: "",
    dna: null,
    followUpQuestions: [],
    evidence: null,
    aiProvider: ""
  });

  const analyze = useCallback(
    (
      text: string,
      images: ImagePayload[]
    ): Promise<AnalyzeResult> => {
    if (!text.trim() && images.length === 0) {
      setState((prev) => ({
        ...prev,
        error: "请提供文字需求或上传图片。"
      }));
      return Promise.resolve(false);
    }

    if (requestInFlight.current) return requestInFlight.current;

    const request = (async (): Promise<AnalyzeResult> => {
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

        const resultDna = data.dna ?? null;
        const resultQuestions = data.followUpQuestions ?? [];

        setState({
          loading: false,
          error: "",
          dna: resultDna,
          followUpQuestions: resultQuestions,
          evidence: data.evidence ?? null,
          aiProvider: data.aiProvider ?? ""
        });

        if (!resultDna) return false;

        return { dna: resultDna, followUpQuestions: resultQuestions };
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "网络错误，请检查连接后重试。"
        }));
        return false;
      }
    })();

    requestInFlight.current = request;
    void request.finally(() => {
      if (requestInFlight.current === request) requestInFlight.current = null;
    });
    return request;
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
