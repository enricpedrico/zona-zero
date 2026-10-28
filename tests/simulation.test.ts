import { describe, expect, it } from "vitest";
import { EVENT_DEFINITIONS, renderEventText } from "../src/engine/events";
import { getItemName, isWeapon, ITEM_DEFINITIONS } from "../src/engine/items";
import {
  isOutcomeRevealed,
  visibleParticipants,
  visibleWeapon,
} from "../src/engine/presentation";
import {
  createGame,
  getRanking,
  simulateNextDay,
  survivorTarget,
  validateGame,
} from "../src/engine/simulation";
import type { GameState, Locale } from "../src/types";

function names(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Participant ${index + 1}`);
}

function finish(game: GameState): GameState {
  let current = game;
  while (current.status !== "complete") current = simulateNextDay(current);
  return current;
}

describe("survival curve", () => {
  it("never falls below two before the final", () => {
    for (let count = 2; count <= 50; count += 1) {
      let previous = count;
      for (let day = 1; day <= 7; day += 1) {
        const target = survivorTarget(count, day);
        expect(target).toBeGreaterThanOrEqual(2);
        expect(target).toBeLessThanOrEqual(previous);
        previous = target;
      }
      expect(survivorTarget(count, 8)).toBe(1);
    }
  });
});

describe("simulation invariants", () => {
  it("finishes in eight days with exactly one winner for groups from 2 to 50", () => {
    for (let count = 2; count <= 50; count += 1) {
      for (let sample = 0; sample < 16; sample += 1) {
        const finished = finish(createGame(names(count), `Test ${count}`, `seed-${count}-${sample}`, "cinematic"));
        expect(finished.currentDay).toBe(8);
        expect(finished.days).toHaveLength(8);
        expect(finished.participants.filter((participant) => participant.alive)).toHaveLength(1);
        expect(validateGame(finished)).toEqual([]);
        expect(getRanking(finished)[0].alive).toBe(true);
        finished.days.forEach((day) => {
          expect(day.survivorsAfter).toBe(survivorTarget(count, day.day));
          expect(day.events.length).toBeGreaterThan(0);
        });
      }
    }
  });

  it("replays the same source state deterministically", () => {
    const source = createGame(names(24), "Replay", "fixed-seed", "intense");
    const first = finish(structuredClone(source));
    const second = finish(structuredClone(source));
    expect(first.days).toEqual(second.days);
    expect(first.participants).toEqual(second.participants);
    expect(first.relationships).toEqual(second.relationships);
  });

  it("delivers a traceable airdrop on the first day", () => {
    const firstDay = simulateNextDay(createGame(names(12), "Airdrop", "airdrop-seed", "cinematic"));
    const drops = firstDay.days[0].events.filter((event) => event.definitionId.startsWith("airdrop_"));

    expect(drops).toHaveLength(1);
    expect(drops[0].itemId).toBeDefined();
    expect(drops[0].itemRecipientId).toBeDefined();
    const recipient = firstDay.participants.find((participant) => participant.id === drops[0].itemRecipientId);
    expect(recipient?.inventory).toContain(drops[0].itemId);
    if (drops[0].itemId && isWeapon(drops[0].itemId)) {
      expect(recipient?.equippedWeapon).toBe(drops[0].itemId);
    }
  });

  it("only exposes eliminations after their event has been revealed", () => {
    const firstDay = simulateNextDay(createGame(names(12), "Reveal", "reveal-seed", "cinematic"));
    firstDay.revealedEvents[1] = firstDay.days[0].events.length;
    const secondDay = simulateNextDay(firstDay);
    const fatalIndex = secondDay.days[1].events.findIndex((event) => event.eliminatedIds.length > 0);
    const survivorsBeforeDay = firstDay.days[0].survivorsAfter;

    secondDay.revealedEvents[2] = fatalIndex;
    expect(visibleParticipants(secondDay)).toHaveLength(survivorsBeforeDay);
    secondDay.revealedEvents[2] = fatalIndex + 1;
    expect(visibleParticipants(secondDay)).toHaveLength(survivorsBeforeDay - 1);
  });

  it("only exposes a supplied weapon after its airdrop has been revealed", () => {
    const firstDay = simulateNextDay(
      createGame(names(4), "Visible loadout", "airdrop-e2e-weapon", "cinematic", true),
    );
    const events = firstDay.days[0].events;
    const dropIndex = events.findIndex((event) => event.definitionId.startsWith("airdrop_"));
    const drop = events[dropIndex];

    expect(dropIndex).toBeGreaterThanOrEqual(0);
    expect(drop.itemId && isWeapon(drop.itemId)).toBe(true);
    expect(drop.itemRecipientId).toBeDefined();
    events.forEach((event) => {
      event.actorIds.forEach((participantId) => {
        expect(Object.prototype.hasOwnProperty.call(event.actorWeapons, participantId)).toBe(true);
      });
    });

    firstDay.revealedEvents[1] = dropIndex;
    expect(visibleWeapon(firstDay, drop.itemRecipientId ?? "")).toBeNull();
    firstDay.revealedEvents[1] = dropIndex + 1;
    expect(visibleWeapon(firstDay, drop.itemRecipientId ?? "")).toBe(drop.itemId);
  });

  it("keeps the final result hidden until every final event is revealed", () => {
    const finished = finish(createGame(names(8), "Final", "hidden-final", "cinematic"));
    finished.revealedEvents[8] = Math.max(0, finished.days[7].events.length - 1);
    expect(isOutcomeRevealed(finished)).toBe(false);
    finished.revealedEvents[8] = finished.days[7].events.length;
    expect(isOutcomeRevealed(finished)).toBe(true);
  });

  it("avoids duplicate incidents within each day and keeps loadouts valid", () => {
    for (let sample = 0; sample < 30; sample += 1) {
      const finished = finish(createGame(names(30), "Variety", `variety-${sample}`, "cinematic", sample % 2 === 0));
      finished.days.forEach((day) => {
        expect(new Set(day.events.map((event) => event.definitionId)).size).toBe(day.events.length);
      });
      finished.participants.forEach((participant) => {
        if (participant.equippedWeapon) {
          expect(isWeapon(participant.equippedWeapon)).toBe(true);
          expect(participant.inventory).toContain(participant.equippedWeapon);
        }
      });
      expect(validateGame(finished)).toEqual([]);
    }
  });

  it("keeps unfiltered events disabled unless the setting is enabled", () => {
    for (let sample = 0; sample < 40; sample += 1) {
      const finished = finish(createGame(names(18), "Standard", `standard-${sample}`, "cinematic"));
      const definitions = finished.days.flatMap((day) =>
        day.events.map((event) => EVENT_DEFINITIONS.find((definition) => definition.id === event.definitionId)),
      );
      expect(definitions.every((definition) => !definition?.darkHumor)).toBe(true);
    }
  });

  it("uses unfiltered events when enabled while remaining deterministic", () => {
    const source = createGame(names(18), "Unfiltered", "unfiltered-seed", "cinematic", true);
    const first = finish(structuredClone(source));
    const second = finish(structuredClone(source));
    const usedDefinitions = first.days.flatMap((day) =>
      day.events.map((event) => EVENT_DEFINITIONS.find((definition) => definition.id === event.definitionId)),
    );

    expect(usedDefinitions.some((definition) => definition?.darkHumor)).toBe(true);
    expect(first.days).toEqual(second.days);
    expect(validateGame(first)).toEqual([]);
  });

  it("rejects invalid participant lists", () => {
    expect(() => createGame(["Only one"], "Invalid", "seed", "soft")).toThrow();
    expect(() => createGame(["Same", "same"], "Invalid", "seed", "soft")).toThrow();
    expect(() => createGame(names(51), "Invalid", "seed", "soft")).toThrow();
  });
});

describe("event catalogue", () => {
  it("offers broad incident, elimination and replay variety", () => {
    expect(EVENT_DEFINITIONS.length).toBeGreaterThanOrEqual(90);
    expect(new Set(EVENT_DEFINITIONS.map((definition) => definition.id)).size).toBe(EVENT_DEFINITIONS.length);
    expect(EVENT_DEFINITIONS.filter((definition) => definition.fatal).length).toBeGreaterThanOrEqual(30);
    expect(new Set(EVENT_DEFINITIONS.filter((definition) => definition.fatal).map((definition) => definition.replayKind)).size)
      .toBeGreaterThanOrEqual(15);
  });

  it("has complete, non-empty translations without franchise terminology", () => {
    const locales: Locale[] = ["ca", "es", "en"];
    const forbidden = [
      ["hunger", "games"].join(" "),
      ["cornu", "copia"].join(""),
      ["pan", "em"].join(""),
      ["mocking", "jay"].join(""),
    ];
    for (const definition of EVENT_DEFINITIONS) {
      for (const locale of locales) {
        const text = renderEventText(definition.id, ["Alpha", "Bravo", "Charlie"], locale);
        expect(text.length).toBeGreaterThan(20);
        forbidden.forEach((term) => expect(text.toLocaleLowerCase()).not.toContain(term));
      }
    }
  });

  it("has translated names for every item", () => {
    const locales: Locale[] = ["ca", "es", "en"];
    ITEM_DEFINITIONS.forEach((item) => {
      locales.forEach((locale) => expect(getItemName(item.id, locale).length).toBeGreaterThan(3));
    });
  });
});
