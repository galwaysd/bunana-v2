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
    <div className="fabric-text-input">
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={t("textInput.placeholder")}
        disabled={disabled}
        maxLength={1200}
        rows={3}
        className="fabric-textarea"
      />
      <div className="fabric-text-input-meta">
        <span>
          {t("textInput.helperText")}
        </span>
        <span>
          {text.length}/1200
        </span>
      </div>
    </div>
  );
}
