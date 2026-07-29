import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bunana V2",
  description: "一句话，找到你的布。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
