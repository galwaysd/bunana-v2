"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/app/i18n";
import LanguageSwitcher from "@/app/i18n/LanguageSwitcher";

export default function TopBar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <header className="topbar">
      <Link href="/" className="topbar-brand" style={{ textDecoration: "none" }}>
        <h1>BUNANA</h1>
        <span>{t("nav.brand")}</span>
      </Link>

      <nav className="topbar-nav">
        <Link
          href="/"
          className={pathname === "/" ? "active" : ""}
        >
          {t("nav.workbench")}
        </Link>
        <Link
          href="/square"
          className={pathname === "/square" ? "active" : ""}
        >
          {t("nav.square")}
        </Link>
      </nav>

      <div style={{ marginLeft: "auto" }}>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
