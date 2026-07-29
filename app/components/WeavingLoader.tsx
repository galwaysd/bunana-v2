"use client";

export default function WeavingLoader() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "0.75rem"
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #e0e0e0",
          borderTopColor: "#4a6741",
          borderRadius: "50%",
          animation: "weave-spin 0.8s linear infinite"
        }}
      />
      <style>{`@keyframes weave-spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: "#666", fontSize: "0.9rem" }}>
        布拿拿正在识别面料...
      </span>
    </div>
  );
}
