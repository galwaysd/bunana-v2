"use client";

import "./tokens.css";
import "./theme.css";

/**
 * BunanaTheme wraps a subtree with the Bunana UI design system scope.
 * It injects design tokens and base theme styles.
 *
 * The `.bunana-ui` class is the single scope under which all
 * token-driven components resolve their CSS custom properties.
 */
export default function BunanaTheme({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bunana-ui" data-bunana-ui>
      {children}
    </div>
  );
}
