import {
  ArrowLeft,
  Crown,
  Download,
  RefreshCw,
  Share2,
  Shield,
  Swords,
  Target,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "../components/Avatar";
import { HighlightedEventText } from "../components/HighlightedEventText";
import { renderEventText } from "../engine/events";
import { getItemName } from "../engine/items";
import { getRanking, relationshipBetween } from "../engine/simulation";
import { translate } from "../i18n";
import { downloadBlob, safeFilename } from "../lib/archive";
import type { GameState, Locale, ParticipantState } from "../types";

interface ResultsScreenProps {
  locale: Locale;
  game: GameState;
  avatars: Map<string, Blob>;
  onReplay: () => void;
  onHome: () => void;
  onExportArchive: () => void;
  onToast: (message: string) => void;
}

function findRelationshipExtreme(game: GameState, strongest: boolean): [ParticipantState, ParticipantState, number] | undefined {
  let result: [ParticipantState, ParticipantState, number] | undefined;
  for (let first = 0; first < game.participants.length; first += 1) {
    for (let second = first + 1; second < game.participants.length; second += 1) {
      const value = relationshipBetween(game, game.participants[first].id, game.participants[second].id);
      if (!result || (strongest ? value > result[2] : value < result[2])) {
        result = [game.participants[first], game.participants[second], value];
      }
    }
  }
  if (!result || (strongest ? result[2] < 15 : result[2] > -15)) return undefined;
  return result;
}

async function createResultImage(game: GameState, locale: Locale): Promise<File> {
  const ranking = getRanking(game);
  const winner = ranking[0];
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");

  context.fillStyle = "#090d0c";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(198,255,61,.13)";
  context.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 48) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y < canvas.height; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.fillStyle = "#c6ff3d";
  context.font = "700 30px sans-serif";
  context.fillText("ZONA ZERO / FINAL TRANSMISSION", 70, 80);
  context.fillStyle = "#f4f1df";
  context.font = "800 72px sans-serif";
  context.fillText(game.title.toUpperCase().slice(0, 26), 70, 180);
  context.fillStyle = "#829085";
  context.font = "500 28px monospace";
  context.fillText(`${translate(locale, "winner").toUpperCase()} / 08 DAYS`, 72, 245);
  context.fillStyle = "#f6a91a";
  context.font = "900 108px sans-serif";
  context.fillText(winner.name.toUpperCase().slice(0, 18), 70, 385);
  context.fillStyle = "#f4f1df";
  context.font = "600 30px monospace";
  context.fillText(
    `${winner.stats.eliminations} ${translate(locale, "eliminations")}  ·  ${winner.stats.incidents} ${translate(locale, "incidents")}`,
    74,
    455,
  );
  context.strokeStyle = "#f6a91a";
  context.lineWidth = 4;
  context.strokeRect(70, 515, 1060, 2);
  context.fillStyle = "#829085";
  context.font = "500 22px monospace";
  context.fillText("war.pedrico.cat", 70, 570);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("canvas");
  return new File([blob], `${safeFilename(game.title)}-resultat.png`, { type: "image/png" });
}

export function ResultsScreen({
  locale,
  game,
  avatars,
  onReplay,
  onHome,
  onExportArchive,
  onToast,
}: ResultsScreenProps) {
  const t = <K extends Parameters<typeof translate>[1]>(key: K) => translate(locale, key);
  const ranking = useMemo(() => getRanking(game), [game]);
  const winner = ranking[0];
  const alliance = useMemo(() => findRelationshipExtreme(game, true), [game]);
  const rivalry = useMemo(() => findRelationshipExtreme(game, false), [game]);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const downloadResult = async () => {
    const file = await createResultImage(game, locale);
    downloadBlob(file, file.name);
  };

  const shareResult = async () => {
    const file = await createResultImage(game, locale);
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: `${game.title} — Zona Zero`, files: [file] });
    } else {
      downloadBlob(file, file.name);
      onToast(t("shareFallback"));
    }
  };

  return (
    <section className="results-page">
      <div className="victory-hero">
        <div className="victory-radar" aria-hidden="true"><i /><i /><i /></div>
        <p className="eyebrow"><Target /> {t("finalEyebrow")}</p>
        <h1>{t("finalTitle")}</h1>
        <div className="winner-lockup">
          <div className="winner-crown"><Crown /></div>
          <Avatar
            name={winner.name}
            seed={winner.avatarSeed}
            version={winner.avatarVersion}
            imageBlob={avatars.get(winner.id)}
            size="hero"
          />
          <span>{t("lastStanding")}</span>
          <h2>{winner.name}</h2>
          <div className="winner-stats">
            <span><strong>{winner.stats.eliminations}</strong>{t("eliminations")}</span>
            <span><strong>{winner.stats.assists}</strong>{t("assists")}</span>
            <span><strong>{winner.stats.incidents}</strong>{t("incidents")}</span>
          </div>
        </div>
      </div>

      <div className="results-grid">
        <section className="ranking-panel">
          <div className="section-heading">
            <div><p className="eyebrow">FINAL / RANK</p><h2>{t("ranking")}</h2></div>
            <Trophy />
          </div>
          <div className="ranking-list">
            {ranking.map((participant, index) => (
              <div className={index === 0 ? "ranking-row ranking-row--winner" : "ranking-row"} key={participant.id}>
                <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
                <Avatar
                  name={participant.name}
                  seed={participant.avatarSeed}
                  version={participant.avatarVersion}
                  imageBlob={avatars.get(participant.id)}
                  size="small"
                  dimmed={!participant.alive}
                />
                <div className="ranking-name">
                  <strong>{participant.name}</strong>
                  <span>{participant.alive ? t("winner") : `${t("day")} ${participant.eliminatedDay}`}</span>
                </div>
                <div className="ranking-stat"><strong>{participant.stats.eliminations}</strong><span>K</span></div>
                <div className="ranking-stat"><strong>{participant.stats.assists}</strong><span>A</span></div>
              </div>
            ))}
          </div>
        </section>

        <aside className="bonds-panel">
          <div className="section-heading">
            <div><p className="eyebrow">REL / MATRIX</p><h2>{t("allianceMap")}</h2></div>
          </div>
          {alliance ? (
            <article className="bond-card bond-card--alliance">
              <Shield />
              <span>{t("strongestAlliance")}</span>
              <strong>{alliance[0].name} + {alliance[1].name}</strong>
              <small>+{alliance[2]} REL</small>
            </article>
          ) : null}
          {rivalry ? (
            <article className="bond-card bond-card--rivalry">
              <Swords />
              <span>{t("fiercestRivalry")}</span>
              <strong>{rivalry[0].name} / {rivalry[1].name}</strong>
              <small>{rivalry[2]} REL</small>
            </article>
          ) : null}
          {!alliance && !rivalry && <p className="empty-bond">{t("noBond")}</p>}
        </aside>
      </div>

      <section className="timeline-panel">
        <button type="button" className="timeline-toggle" onClick={() => setTimelineOpen((open) => !open)} aria-expanded={timelineOpen}>
          <span><Target /> {t("fullTimeline")}</span>
          <strong>{timelineOpen ? "−" : "+"}</strong>
        </button>
        {timelineOpen && (
          <div className="timeline-days">
            {game.days.map((day) => (
              <article key={day.day}>
                <header><span>{String(day.day).padStart(2, "0")}</span><h3>{t("dayNames")[day.day - 1]}</h3></header>
                {day.events.map((event) => (
                  <p key={event.id}>
                    <HighlightedEventText
                      text={renderEventText(
                        event.definitionId,
                        event.actorIds.map((id) => game.participants.find((participant) => participant.id === id)?.name ?? ""),
                        locale,
                        getItemName(event.itemId, locale),
                      )}
                      names={event.actorIds.map(
                        (id) => game.participants.find((participant) => participant.id === id)?.name ?? "",
                      )}
                    />
                  </p>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="result-actions">
        <button type="button" className="primary-button" onClick={shareResult}><Share2 /> {t("shareResult")}</button>
        <button type="button" className="secondary-button" onClick={downloadResult}><Download /> {t("downloadResult")}</button>
        <button type="button" className="secondary-button" onClick={onExportArchive}><Download /> {t("export")}</button>
        <button type="button" className="secondary-button" onClick={onReplay}><RefreshCw /> {t("replay")}</button>
        <button type="button" className="text-button result-home" onClick={onHome}><ArrowLeft /> {t("goHome")}</button>
      </div>
    </section>
  );
}
