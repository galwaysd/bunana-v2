"use client";

import { useI18n } from "@/app/i18n";

type Props = {
  text: string;
  onTextChange: (text: string) => void;
  disabled?: boolean;
};

export default function TextInput({ text, onTextChange, disabled }: Props) {
  const { t } = useI18n();
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={t("textInput.placeholder")}
        disabled={disabled}
        maxLength={1200}
        rows={3}
        style={{
          width: "100%",
          padding: "0.75rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          fontSize: "0.95rem",
          lineHeight: 1.6,
          resize: "vertical",
          fontFamily: "inherit",
          background: "#fff"
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
        <span style={{ color: "#999", fontSize: "0.75rem" }}>
          {t("textInput.helperText")}
        </span>
        <span style={{ color: "#999", fontSize: "0.75rem" }}>
          {text.length}/1200
        </span>
      </div>
    </div>
  );
}
