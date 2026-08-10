"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "./index";
import { LOCALES } from "./translations";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          padding: "0.3rem 0.6rem",
          border: "1px solid #ddd",
          borderRadius: "6px",
          background: "transparent",
          cursor: "pointer",
          fontSize: "0.8rem",
          color: "inherit",
          fontWeight: 500,
        }}
        aria-label="Language switcher"
      >
        <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{current.flag}</span>
        <span>{current.label}</span>
        <span style={{ fontSize: "0.6rem", opacity: 0.5 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "0.25rem",
            minWidth: "120px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            background: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "none",
                background:
                  l.code === locale ? "#f0f7f0" : "transparent",
                cursor: "pointer",
                fontSize: "0.8rem",
                textAlign: "left",
                color: "#333",
                fontWeight: l.code === locale ? 600 : 400,
              }}
            >
              <span style={{ fontSize: "0.7rem", opacity: 0.6, width: "1.5rem" }}>
                {l.flag}
              </span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
