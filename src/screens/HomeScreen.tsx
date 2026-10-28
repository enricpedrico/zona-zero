import {
  ArchiveRestore,
  ArrowRight,
  Copy,
  Download,
  HardDrive,
  Play,
  Plus,
  Radio,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import type { GameSummary, Locale } from "../types";
import { translate } from "../i18n";

interface HomeScreenProps {
  locale: Locale;
  games: GameSummary[];
  onNew: () => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string) => void;
  onImport: (file: File) => void;
}

export function HomeScreen({
  locale,
  games,
  onNew,
  onResume,
  onDelete,
  onDuplicate,
  onExport,
  onImport,
}: HomeScreenProps) {
  const t = <K extends Parameters<typeof translate>[1]>(key: K) => translate(locale, key);

  return (
    <>
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="radar radar--hero" aria-hidden="true">
          <span />
        </div>
        <div className="hero-copy">
          <p className="eyebrow"><Radio size={14} /> {t("brandTagline")}</p>
          <h1>
            ZONA
            <br />
            <span>ZERO</span>
          </h1>
          <p className="hero-statement">{t("homeIntro")}</p>
          <p className="hero-description">{t("homeDescription")}</p>
          <button type="button" className="primary-button primary-button--large" onClick={onNew}>
            <Plus /> {t("newSimulation")} <ArrowRight />
          </button>
        </div>
        <div className="hero-status" aria-hidden="true">
          <span>SYS / ONLINE</span>
          <strong>08</strong>
          <small>DAYS</small>
        </div>
      </section>

      <section className="feature-strip" aria-label="Features">
        <span><HardDrive /> {t("localOnly")}</span>
        <span><ShieldCheck /> {t("noAccounts")}</span>
        <span><ArchiveRestore /> {t("reproducible")}</span>
      </section>

      <section className="operations-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ARCHIVE / LOCAL</p>
            <h2>{t("savedOperations")}</h2>
          </div>
          <label className="secondary-button file-button">
            <Upload /> {t("importGame")}
            <input
              type="file"
              accept=".zonazero,application/zip"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) onImport(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        {games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-radar"><span /></div>
            <h3>{t("noSavedGames")}</h3>
            <button type="button" className="secondary-button" onClick={onNew}>
              <Plus /> {t("createFirst")}
            </button>
          </div>
        ) : (
          <div className="operation-grid">
            {games.map((game) => (
              <article className="operation-card" key={game.id}>
                <div className="operation-card__signal" />
                <div className="operation-card__top">
                  <span className={`status-badge status-badge--${game.status}`}>
                    {game.status === "complete" ? t("statusComplete") : t("statusActive")}
                  </span>
                  <time dateTime={game.updatedAt}>
                    {new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale === "es" ? "es-AR" : "ca", {
                      day: "2-digit",
                      month: "short",
                    }).format(new Date(game.updatedAt))}
                  </time>
                </div>
                <h3>{game.title}</h3>
                {game.winnerName && <p className="operation-winner">{t("winner")}: <strong>{game.winnerName}</strong></p>}
                <div className="operation-stats">
                  <span><Users /> <strong>{game.survivors}</strong> / {game.initialCount}</span>
                  <span><Radio /> <strong>{t("day")} {game.currentDay}</strong> / 8</span>
                </div>
                <button type="button" className="card-action" onClick={() => onResume(game.id)}>
                  <Play /> {t("resume")} <ArrowRight />
                </button>
                <div className="card-tools">
                  <button type="button" onClick={() => onDuplicate(game.id)} aria-label={t("duplicate")} title={t("duplicate")}><Copy /></button>
                  <button type="button" onClick={() => onExport(game.id)} aria-label={t("export")} title={t("export")}><Download /></button>
                  <button
                    type="button"
                    className="danger-tool"
                    onClick={() => window.confirm(t("confirmDelete")) && onDelete(game.id)}
                    aria-label={t("delete")}
                    title={t("delete")}
                  >
                    <Trash2 />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
