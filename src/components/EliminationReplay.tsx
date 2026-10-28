import {
  CloudFog,
  Crosshair,
  Flame,
  Ghost,
  MoveDown,
  PawPrint,
  RadioTower,
  RotateCcw,
  ScanLine,
  TriangleAlert,
  Waves,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EVENT_DEFINITIONS, renderEventText } from "../engine/events";
import { getItemName } from "../engine/items";
import { translate } from "../i18n";
import type { EventResult, GameState, Locale } from "../types";
import { HighlightedEventText } from "./HighlightedEventText";
import { Modal } from "./Modal";
import { TacticalFigure } from "./TacticalFigure";

interface EliminationReplayProps {
  event: EventResult;
  game: GameState;
  avatars: Map<string, Blob>;
  locale: Locale;
  onClose: () => void;
}

export function EliminationReplay({ event, game, avatars, locale, onClose }: EliminationReplayProps) {
  const t = <K extends Parameters<typeof translate>[1]>(key: K) => translate(locale, key);
  const [playback, setPlayback] = useState(0);
  const participants = useMemo(
    () =>
      event.actorIds
        .map((id) => game.participants.find((participant) => participant.id === id))
        .filter((participant) => participant !== undefined),
    [event.actorIds, game.participants],
  );
  const victimId = event.eliminatedIds[0];
  const victim = participants.find((participant) => participant.id === victimId);
  const sources = participants.filter((participant) => participant.id !== victimId);
  const definition = EVENT_DEFINITIONS.find((candidate) => candidate.id === event.definitionId);
  const kind = definition?.replayKind ?? (event.category === "environment" ? "exposure" : "ambush");
  const names = participants.map((participant) => participant.name);
  const itemName = getItemName(event.itemId, locale);
  const weaponAtEvent = (participantId: string) => {
    const snapshots = event.actorWeapons;
    if (snapshots) {
      return Object.prototype.hasOwnProperty.call(snapshots, participantId)
        ? snapshots[participantId] ?? null
        : null;
    }
    return game.participants.find((participant) => participant.id === participantId)?.equippedWeapon;
  };
  const EffectIcon =
    kind === "storm" || kind === "shock"
      ? Zap
      : kind === "collapse" || kind === "crush" || kind === "cave"
        ? TriangleAlert
        : kind === "eject"
          ? RadioTower
          : kind === "fire"
            ? Flame
            : kind === "flood"
              ? Waves
              : kind === "fall"
                ? MoveDown
                : kind === "fog"
                  ? CloudFog
                  : kind === "creature"
                    ? PawPrint
                    : Crosshair;

  if (!victim) return null;

  return (
    <Modal
      title={`${t("replayTitle")}: ${victim.name}`}
      eyebrow={`REPLAY / D${String(event.day).padStart(2, "0")}`}
      closeLabel={t("close")}
      onClose={onClose}
    >
      <div className="replay-shell">
        <div
          className={`replay-stage replay-stage--${kind}`}
          key={playback}
          role="img"
          aria-label={renderEventText(event.definitionId, names, locale, itemName)}
        >
          <div className="replay-grid" aria-hidden="true" />
          <div className="replay-radar" aria-hidden="true"><i /></div>
          <div className="replay-scan" aria-hidden="true" />
          <div className={`replay-hazard replay-hazard--${kind}`} aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <div className="replay-hud replay-hud--top">
            <span><i /> REC</span>
            <span>CAM / {String(event.day).padStart(2, "0")}-{event.id.split("_").at(-1)}</span>
          </div>
          <div className="replay-effect" aria-hidden="true">
            <EffectIcon />
          </div>
          {sources.slice(0, 2).map((participant, index) => (
            <div
              className={`replay-sprite replay-sprite--source replay-sprite--source-${index + 1}`}
              key={participant.id}
            >
              <TacticalFigure
                participant={participant}
                imageBlob={avatars.get(participant.id)}
                weapon={weaponAtEvent(participant.id)}
                size="replay"
              />
              <strong>{participant.name}</strong>
              <small>TRACK / {String(index + 1).padStart(2, "0")}</small>
            </div>
          ))}
          <div className="replay-sprite replay-sprite--victim">
            <TacticalFigure
              participant={victim}
              imageBlob={avatars.get(victim.id)}
              weapon={weaponAtEvent(victim.id)}
              size="replay"
            />
            <strong>{victim.name}</strong>
            <small>TARGET / LOST</small>
          </div>
          <div className="replay-impact" aria-hidden="true"><ScanLine /></div>
          <div className="replay-lost"><RadioTower /><span>{t("replaySignalLost")}</span><strong>{victim.name}</strong></div>
          <div className="replay-hud replay-hud--bottom">
            <span>{t("replayEvidence")}</span>
            <span>03.6 SEC</span>
          </div>
          <div className="replay-timeline" aria-hidden="true"><i /></div>
        </div>

        <div className="replay-caption">
          <div>
            {definition?.darkHumor && <span className="humor-badge"><Ghost /> {t("darkHumorBadge")}</span>}
            <p>
              <HighlightedEventText
                text={renderEventText(event.definitionId, names, locale, itemName)}
                names={names}
              />
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={() => setPlayback((current) => current + 1)}>
            <RotateCcw /> {t("replayAgain")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
