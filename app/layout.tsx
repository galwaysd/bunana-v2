import type { Metadata } from "next";
import TopBar from "./components/TopBar";
import { LanguageProvider } from "./i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "BUNANA · Fabric Workbench",
  description: "Find your fabric in one sentence.",
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <LanguageProvider>
          <TopBar />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
