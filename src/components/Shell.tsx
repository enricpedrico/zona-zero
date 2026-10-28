import { Crosshair, Shield } from "lucide-react";
import type { ReactNode } from "react";
import type { Locale } from "../types";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface ShellProps {
  children: ReactNode;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onHome: () => void;
  onLegal: () => void;
  legalLabel: string;
  compact?: boolean;
}

export function Shell({
  children,
  locale,
  onLocaleChange,
  onHome,
  onLegal,
  legalLabel,
  compact = false,
}: ShellProps) {
  return (
    <div className={compact ? "app-shell app-shell--compact" : "app-shell"}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <button type="button" className="brand-lockup" onClick={onHome} aria-label="Zona Zero">
          <span className="brand-mark">
            <Crosshair size={25} strokeWidth={1.8} />
          </span>
          <span>
            <strong>ZONA ZERO</strong>
            <small>SIM / 08</small>
          </span>
        </button>
        <LanguageSwitcher locale={locale} onChange={onLocaleChange} />
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer className="site-footer">
        <span>
          <Shield size={15} /> LOCAL-FIRST / NO TRACKING
        </span>
        <button type="button" className="text-button" onClick={onLegal}>
          {legalLabel}
        </button>
      </footer>
    </div>
  );
}
