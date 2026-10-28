import {
  Activity,
  ArrowRight,
  Crosshair,
  Eye,
  HeartPulse,
  Radio,
  Shield,
  Skull,
  Users,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "../components/Avatar";
import { EliminationReplay } from "../components/EliminationReplay";
import { HighlightedEventText } from "../components/HighlightedEventText";
import { ItemGlyph } from "../components/ItemGlyph";
import { SupplyDropVisual } from "../components/SupplyDropVisual";
import { TacticalFigure } from "../components/TacticalFigure";
import { renderEventText } from "../engine/events";
import { getItemName } from "../engine/items";
import {
  currentDayReport,
  revealedCount,
  visibleParticipants,
  visibleWeapon,
} from "../engine/presentation";
import { translate } from "../i18n";
import type { EventCategory, EventResult, GameState, Locale } from "../types";

interface GameScreenProps {
  locale: Locale;
  game: GameState;
  avatars: Map<string, Blob>;
  onAdvance: () => Promise<GameState>;
  onReveal: (day: number, count: number) => Promise<void>;
  onFinish: () => void;
}

const categoryIcons: Record<EventCategory, typeof Crosshair> = {
  conflict: Crosshair,
  environment: Activity,
  alliance: Shield,
  discovery: Eye,
};

export function GameScreen({ locale, game, avatars, onAdvance, onReveal, onFinish }: GameScreenProps) {
  const t = <K extends Parameters<typeof translate>[1]>(key: K) => translate(locale, key);
  const [advancing, setAdvancing] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [replayEvent, setReplayEvent] = useState<EventResult>();

  const participantsById = useMemo(
    () => new Map(game.participants.map((participant) => [participant.id, participant])),
    [game.participants],
  );
  const currentReport = currentDayReport(game);
  const revealed = revealedCount(game);
  const alive = visibleParticipants(game);
  const allRevealed = Boolean(currentReport && revealed >= currentReport.events.length);
  const dayName = game.currentDay ? t("dayNames")[game.currentDay - 1] : t("dayNames")[0];

  const beginNextDay = async () => {
    setAdvancing(true);
    try {
      await onAdvance();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setAdvancing(false);
    }
  };

  const revealNext = async () => {
    if (!currentReport) return;
    setRevealing(true);
    try {
      await onReveal(currentReport.day, Math.min(currentReport.events.length, revealed + 1));
    } finally {
      setRevealing(false);
    }
  };

  return (
    <section className="game-page">
      <header className="mission-header">
        <div className="mission-heading">
          <p className="eyebrow"><Radio size={14} /> {t("activeSignal")}</p>
          <h1>{game.title}</h1>
          <p>{game.currentDay ? `${t("day")} ${game.currentDay} / 8 — ${dayName}` : t("missionLog")}</p>
        </div>
        <div className="mission-telemetry">
          <div><span>{t("survivors")}</span><strong>{alive.length}</strong><small>/ {game.initialCount}</small></div>
          <div><span>{t("day")}</span><strong>{game.currentDay || "—"}</strong><small>/ 8</small></div>
          <div className="pulse-status"><i /><span>{t("zoneStable")}</span></div>
        </div>
      </header>

      <div className="day-progress" aria-label={`${t("day")} ${game.currentDay} ${t("of")} 8`}>
        {Array.from({ length: 8 }, (_, index) => (
          <span
            className={index + 1 < game.currentDay ? "is-past" : index + 1 === game.currentDay ? "is-current" : ""}
            key={index}
          >
            <i />
            <b>{String(index + 1).padStart(2, "0")}</b>
          </span>
        ))}
      </div>

      {game.currentDay === 0 ? (
        <div className="deployment-screen">
          <div className="deployment-copy">
            <span className="coordinates">41.3874° N / 02.1686° E</span>
            <h2>{t("dayNames")[0]}</h2>
            <p>{game.initialCount} {t("participants").toLocaleLowerCase()} / 08 {t("survivalDays").toLocaleLowerCase()}</p>
            <button type="button" className="primary-button primary-button--large" onClick={beginNextDay} disabled={advancing}>
              {advancing ? <span className="spinner" /> : <Crosshair />} {t("revealIncident")} <ArrowRight />
            </button>
          </div>
          <div className="deployment-roster">
            {game.participants.map((participant) => (
              <div className="deployment-person" key={participant.id}>
                <Avatar
                  name={participant.name}
                  seed={participant.avatarSeed}
                  version={participant.avatarVersion}
                  imageBlob={avatars.get(participant.id)}
                />
                <strong>{participant.name}</strong>
                <span>READY</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mission-layout">
          <div className="event-feed">
            <div className="feed-heading">
              <div>
                <p className="eyebrow">LOG / {String(game.currentDay).padStart(2, "0")}</p>
                <h2>{t("missionLog")}</h2>
              </div>
              <span>{revealed} / {currentReport?.events.length ?? 0}</span>
            </div>

            <div className="event-list" aria-live="polite">
              {currentReport?.events.slice(0, revealed).map((event, index) => {
                const actors = event.actorIds.map((id) => participantsById.get(id)).filter(Boolean);
                const CategoryIcon = categoryIcons[event.category];
                const itemName = getItemName(event.itemId, locale);
                const itemRecipient = event.itemRecipientId ? participantsById.get(event.itemRecipientId) : undefined;
                const isAirdrop = event.definitionId.startsWith("airdrop_");
                return (
                  <article
                    className={`event-card event-card--${event.category}${event.eliminatedIds.length ? " event-card--fatal" : ""}${isAirdrop ? " event-card--airdrop" : ""}`}
                    key={event.id}
                  >
                    <div className="event-card__index">{String(index + 1).padStart(2, "0")}</div>
                    <div className="event-card__avatars">
                      {actors.map((participant) =>
                        participant ? (
                          <Avatar
                            key={participant.id}
                            name={participant.name}
                            seed={participant.avatarSeed}
                            version={participant.avatarVersion}
                            imageBlob={avatars.get(participant.id)}
                            size="small"
                            dimmed={event.eliminatedIds.includes(participant.id)}
                          />
                        ) : null,
                      )}
                    </div>
                    <div className="event-card__copy">
                      <span className="event-category">
                        <CategoryIcon />
                        {t(
                          event.category === "conflict"
                            ? "incidentConflict"
                            : event.category === "environment"
                              ? "incidentEnvironment"
                              : event.category === "alliance"
                                ? "incidentAlliance"
                                : "incidentDiscovery",
                        )}
                      </span>
                      <p>
                        <HighlightedEventText
                          text={renderEventText(event.definitionId, actors.map((actor) => actor?.name ?? ""), locale, itemName)}
                          names={actors.map((actor) => actor?.name ?? "")}
                        />
                      </p>
                      {isAirdrop && event.itemId && itemRecipient && (
                        <SupplyDropVisual
                          participant={itemRecipient}
                          itemId={event.itemId}
                          weapon={event.actorWeapons?.[itemRecipient.id]}
                          imageBlob={avatars.get(itemRecipient.id)}
                          locale={locale}
                        />
                      )}
                    </div>
                    {event.eliminatedIds.length > 0 && (
                      <div className="event-card__fatal-actions">
                        <Skull className="fatal-mark" aria-label={t("eliminated")} />
                        <button
                          type="button"
                          className="event-replay-button"
                          onClick={() => setReplayEvent(event)}
                        >
                          <Video /> {t("watchReplay")}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {!allRevealed && (
              <button type="button" className="reveal-button" onClick={revealNext} disabled={revealing}>
                <span className="scan-line" />
                <Eye /> {revealed === 0 ? t("revealIncident") : t("nextIncident")} <ArrowRight />
              </button>
            )}

            {allRevealed && currentReport && (
              <section className="day-report">
                <div className="day-report__heading">
                  <span>{String(currentReport.day).padStart(2, "0")}</span>
                  <div><p className="eyebrow">REPORT / CLOSED</p><h3>{t("dayReport")}</h3></div>
                </div>
                <div className="report-stats">
                  <div><Users /><strong>{currentReport.survivorsAfter}</strong><span>{t("survivors")}</span></div>
                  <div><HeartPulse /><strong>{currentReport.events.length}</strong><span>{t("incidents")}</span></div>
                  <div><Skull /><strong>{currentReport.eliminatedIds.length}</strong><span>{t("eliminatedToday")}</span></div>
                </div>
                {currentReport.eliminatedIds.length ? (
                  <div className="fallen-list">
                    {currentReport.eliminatedIds.map((id) => {
                      const participant = participantsById.get(id);
                      return participant ? (
                        <span key={id}>
                          <Avatar
                            name={participant.name}
                            seed={participant.avatarSeed}
                            version={participant.avatarVersion}
                            imageBlob={avatars.get(id)}
                            size="small"
                            dimmed
                          />
                          {participant.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="quiet-report">{t("noEliminations")}</p>
                )}
                <button
                  type="button"
                  className="primary-button primary-button--large"
                  onClick={game.status === "complete" ? onFinish : beginNextDay}
                  disabled={advancing}
                >
                  {advancing ? <span className="spinner" /> : <ArrowRight />}
                  {game.status === "complete" ? t("finalTitle") : game.currentDay === 7 ? t("proceedFinal") : t("proceedDay")}
                </button>
              </section>
            )}
          </div>

          <aside className="survivor-panel">
            <div className="survivor-panel__heading">
              <h2>{t("survivors")}</h2>
              <span>{alive.length}</span>
            </div>
            <div className="survivor-list">
              {alive.map((participant) => {
                const weapon = visibleWeapon(game, participant.id);
                return (
                <div className="survivor-row" key={participant.id}>
                  <div className="survivor-row__intel">
                    <strong>{participant.name}</strong>
                    <span><i /> {t("alive")} · {participant.stats.eliminations} K</span>
                    {weapon && (
                      <div className="survivor-loadout">
                        <>
                          <ItemGlyph itemId={weapon} />
                          <small>{getItemName(weapon, locale)}</small>
                        </>
                      </div>
                    )}
                  </div>
                  <TacticalFigure
                    participant={participant}
                    imageBlob={avatars.get(participant.id)}
                    weapon={weapon}
                    size="small"
                  />
                </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}
      {replayEvent && (
        <EliminationReplay
          event={replayEvent}
          game={game}
          avatars={avatars}
          locale={locale}
          onClose={() => setReplayEvent(undefined)}
        />
      )}
    </section>
  );
}
