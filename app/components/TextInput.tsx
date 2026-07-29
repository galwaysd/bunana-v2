"use client";

type Props = {
  text: string;
  onTextChange: (text: string) => void;
  disabled?: boolean;
};

export default function TextInput({ text, onTextChange, disabled }: Props) {
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="描述你需要的面料，例如：雨伞用防水布，190T涤塔夫，PU涂层..."
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
          图片和文字至少填一项，最多 1200 字
        </span>
        <span style={{ color: "#999", fontSize: "0.75rem" }}>
          {text.length}/1200
        </span>
      </div>
    </div>
  );
}
