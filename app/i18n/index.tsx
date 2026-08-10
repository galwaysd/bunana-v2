"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { type Locale, t as translate, tArray as translateArray } from "./translations";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  tArray: (path: string) => string[];
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "bunana-locale";

/** Map locale to HTML lang attribute */
const LOCALE_TO_LANG: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en",
  ja: "ja",
  ko: "ko",
};

/** Map locale to date format locale */
export const LOCALE_TO_DATE: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  // Load saved locale on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && ["zh", "en", "ja", "ko"].includes(saved)) {
        setLocaleState(saved);
      } else {
        // Auto-detect browser language
        const browser = navigator.language.toLowerCase();
        if (browser.startsWith("ja")) setLocaleState("ja");
        else if (browser.startsWith("ko")) setLocaleState("ko");
        else if (browser.startsWith("en")) setLocaleState("en");
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Update <html lang="..."> when locale changes
  useEffect(() => {
    document.documentElement.lang = LOCALE_TO_LANG[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) =>
      translate(locale, path, vars),
    [locale]
  );

  const tArrayFn = useCallback(
    (path: string) => translateArray(locale, path),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tArray: tArrayFn }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return ctx;
}
