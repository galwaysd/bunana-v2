"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <Link href="/" className="topbar-brand" style={{ textDecoration: "none" }}>
        <h1>BUNANA</h1>
        <span>织物工作台</span>
      </Link>

      <nav className="topbar-nav">
        <Link
          href="/"
          className={pathname === "/" ? "active" : ""}
        >
          工作台
        </Link>
        <Link
          href="/square"
          className={pathname === "/square" ? "active" : ""}
        >
          布市场
        </Link>
      </nav>
    </header>
  );
}
