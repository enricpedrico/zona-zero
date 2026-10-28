import { isWeapon } from "./items";
import type { DayResult, EventResult, GameState, ItemId, ParticipantState } from "../types";

export function currentDayReport(game: GameState): DayResult | undefined {
  return game.currentDay > 0 ? game.days[game.currentDay - 1] : undefined;
}

export function revealedCount(game: GameState): number {
  const report = currentDayReport(game);
  if (!report) return 0;
  return Math.min(report.events.length, Math.max(0, game.revealedEvents?.[report.day] ?? 0));
}

export function visibleParticipants(game: GameState): ParticipantState[] {
  const report = currentDayReport(game);
  const revealed = revealedCount(game);
  const hiddenEliminations = new Set(
    report?.events.slice(revealed).flatMap((event) => event.eliminatedIds) ?? [],
  );
  return game.participants.filter(
    (participant) => participant.alive || hiddenEliminations.has(participant.id),
  );
}

function revealedEvents(game: GameState): EventResult[] {
  return game.days.flatMap((day) => {
    if (day.day < game.currentDay) return day.events;
    if (day.day === game.currentDay) return day.events.slice(0, revealedCount(game));
    return [];
  });
}

export function visibleWeapon(game: GameState, participantId: string): ItemId | null {
  let weapon: ItemId | null = null;

  for (const event of revealedEvents(game)) {
    const snapshots = event.actorWeapons;
    if (snapshots && event.actorIds.includes(participantId)) {
      weapon = Object.prototype.hasOwnProperty.call(snapshots, participantId)
        ? snapshots[participantId] ?? null
        : null;
      continue;
    }

    // Older archives did not store explicit null snapshots.
    if (event.definitionId === "disarm" && event.actorIds.at(-1) === participantId) {
      weapon = null;
    } else if (
      event.itemRecipientId === participantId &&
      event.itemId &&
      isWeapon(event.itemId)
    ) {
      weapon = event.itemId;
    }
  }

  return weapon;
}

export function isOutcomeRevealed(game: GameState): boolean {
  const report = currentDayReport(game);
  return game.status === "complete" && Boolean(report) && revealedCount(game) >= (report?.events.length ?? 0);
}
