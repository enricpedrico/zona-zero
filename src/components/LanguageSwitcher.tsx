import { localeMeta } from "../i18n";
import type { Locale } from "../types";

interface LanguageSwitcherProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

export function LanguageSwitcher({ locale, onChange }: LanguageSwitcherProps) {
  return (
    <div className="language-switcher" role="group" aria-label="Language">
      {(Object.keys(localeMeta) as Locale[]).map((candidate) => (
        <button
          type="button"
          className={candidate === locale ? "language-button is-active" : "language-button"}
          aria-pressed={candidate === locale}
          aria-label={localeMeta[candidate].label}
          title={localeMeta[candidate].label}
          onClick={() => onChange(candidate)}
          key={candidate}
        >
          {candidate === "ca" ? (
            <span className="catalan-flag" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : (
            <span aria-hidden="true">{localeMeta[candidate].flag}</span>
          )}
          <span className="language-code">{candidate.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
