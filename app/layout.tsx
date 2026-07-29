import type { Metadata } from "next";
import TopBar from "./components/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "BUNANA · 织物工作台",
  description: "一句话，找到你的布。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
