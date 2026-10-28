import { EVENT_DEFINITIONS } from "./events";
import {
  bestWeapon,
  isItemId,
  isWeapon,
  itemPower,
  SURVIVAL_ITEM_IDS,
  WEAPON_IDS,
} from "./items";
import { createId, hashNumber, SeededRandom } from "../lib/random";
import type {
  DayResult,
  EventDefinition,
  EventResult,
  GameState,
  Intensity,
  ItemId,
  ParticipantState,
  RelationshipState,
} from "../types";

const SURVIVAL_CURVE = [1, 0.82, 0.65, 0.5, 0.37, 0.26, 0.16, 0.08, 0.02];

function pairKey(first: string, second: string): string {
  return [first, second].sort().join(":");
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function aliveParticipants(game: GameState): ParticipantState[] {
  return game.participants.filter((participant) => participant.alive);
}

function itemPool(kind: EventDefinition["itemPool"]): readonly ItemId[] {
  if (kind === "weapon") return WEAPON_IDS;
  if (kind === "survival") return SURVIVAL_ITEM_IDS;
  return [...WEAPON_IDS, ...SURVIVAL_ITEM_IDS];
}

function grantItem(
  participant: ParticipantState,
  rng: SeededRandom,
  pool: EventDefinition["itemPool"] = "survival",
): ItemId {
  const candidates = itemPool(pool);
  const missing = candidates.filter((itemId) => !participant.inventory.includes(itemId));
  const itemId = rng.pick(missing.length ? missing : candidates);
  if (!participant.inventory.includes(itemId)) participant.inventory.push(itemId);

  if (isWeapon(itemId)) {
    if (!participant.equippedWeapon || itemPower(itemId) > itemPower(participant.equippedWeapon)) {
      participant.equippedWeapon = itemId;
    }
    participant.combat = clamp(participant.combat + itemPower(itemId));
  } else if (itemId === "medkit") {
    participant.health = clamp(participant.health + 16);
    participant.injuries = Math.max(0, participant.injuries - 1);
  } else if (itemId === "light_armor") {
    participant.health = clamp(participant.health + 8);
    participant.survival = clamp(participant.survival + 5);
  } else if (itemId === "ration_pack" || itemId === "water_filter") {
    participant.supplies += 1;
  } else {
    participant.survival = clamp(participant.survival + 3);
  }
  return itemId;
}

export function survivorTarget(initialCount: number, day: number): number {
  if (day >= 8) return 1;
  return Math.max(2, Math.ceil(initialCount * SURVIVAL_CURVE[day]));
}

export function createGame(
  names: string[],
  title: string,
  seed: string,
  intensity: Intensity,
  darkHumor = false,
): GameState {
  if (names.length < 2 || names.length > 50) {
    throw new Error("A simulation requires between 2 and 50 participants");
  }

  const cleanNames = names.map((name) => name.trim()).filter(Boolean);
  if (cleanNames.length !== names.length) throw new Error("Participant names cannot be empty");
  const normalized = cleanNames.map((name) => name.toLocaleLowerCase());
  if (new Set(normalized).size !== normalized.length) throw new Error("Participant names must be unique");

  const rng = new SeededRandom(`${seed}:participants`);
  const participants: ParticipantState[] = cleanNames.map((name, index) => ({
    id: `p_${index}_${hashNumber(`${seed}:${index}:${name.toLocaleLowerCase()}`).toString(36)}`,
    name,
    avatarSeed: rng.int(1, 2_147_483_647),
    avatarVersion: 0,
    hasCustomAvatar: false,
    alive: true,
    health: rng.int(72, 100),
    morale: rng.int(55, 95),
    combat: rng.int(30, 95),
    survival: rng.int(30, 95),
    stealth: rng.int(30, 95),
    supplies: rng.int(0, 2),
    injuries: 0,
    inventory: [],
    stats: {
      eliminations: 0,
      assists: 0,
      incidents: 0,
      daysSurvived: 0,
    },
  }));

  const relationships: RelationshipState = {};
  for (let first = 0; first < participants.length; first += 1) {
    for (let second = first + 1; second < participants.length; second += 1) {
      relationships[pairKey(participants[first].id, participants[second].id)] = rng.int(-8, 8);
    }
  }

  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: createId("game"),
    title: title.trim() || "Zona Zero",
    seed,
    intensity,
    darkHumor,
    status: "active",
    currentDay: 0,
    initialCount: participants.length,
    participants,
    relationships,
    days: [],
    revealedEvents: {},
    createdAt: now,
    updatedAt: now,
  };
}

function chooseActors(
  game: GameState,
  definition: EventDefinition,
  rng: SeededRandom,
  touched: Set<string>,
): ParticipantState[] {
  const alive = aliveParticipants(game);
  const count = Math.min(definition.actorCount, alive.length);
  const selected: ParticipantState[] = [];

  while (selected.length < count) {
    const unselected = alive.filter((participant) => !selected.includes(participant));
    const available =
      definition.requiresWeapon && selected.length === 0
        ? unselected.filter((participant) => participant.equippedWeapon)
        : unselected;
    const candidate = rng.weighted(available, (participant) => {
      const freshness = touched.has(participant.id) ? 1 : 4;
      const vulnerability = definition.fatal
        ? 1.7 - (participant.survival + participant.health + participant.stealth + itemPower(participant.equippedWeapon) * 4) / 320
        : 1;
      const firstActor = selected[0];
      const relationship = firstActor
        ? game.relationships[pairKey(firstActor.id, participant.id)] ?? 0
        : 0;
      const relationshipWeight =
        definition.category === "alliance"
          ? 1 + (relationship + 100) / 100
          : definition.category === "conflict"
            ? 1 + (100 - relationship) / 100
            : 1;
      return freshness * Math.max(0.2, vulnerability) * relationshipWeight;
    });
    selected.push(candidate);
  }

  if (definition.fatal && selected.length > 1) {
    const possibleVictims = definition.requiresWeapon ? selected.slice(1) : selected;
    const victim = rng.weighted(possibleVictims, (participant) => {
      return Math.max(0.2, 2 - (participant.survival + participant.health) / 100);
    });
    const remaining = selected.filter((participant) => participant.id !== victim.id);
    return [...remaining, victim];
  }

  return selected;
}

function adjustRelationship(
  relationships: RelationshipState,
  participants: ParticipantState[],
  delta: number,
): void {
  for (let first = 0; first < participants.length; first += 1) {
    for (let second = first + 1; second < participants.length; second += 1) {
      const key = pairKey(participants[first].id, participants[second].id);
      relationships[key] = clamp((relationships[key] ?? 0) + delta, -100, 100);
    }
  }
}

function applyEvent(
  game: GameState,
  definition: EventDefinition,
  actors: ParticipantState[],
  day: number,
  eventIndex: number,
  rng: SeededRandom,
): EventResult {
  actors.forEach((participant) => {
    participant.stats.incidents += 1;
  });

  if (definition.relationshipDelta) {
    adjustRelationship(game.relationships, actors, definition.relationshipDelta);
  }

  const eliminatedIds: string[] = [];
  let itemId: ItemId | undefined;
  let itemRecipientId: string | undefined;
  if (definition.fatal) {
    const victim = actors[actors.length - 1];
    const attacker = actors.length > 1 ? actors[0] : undefined;
    victim.alive = false;
    victim.health = 0;
    victim.eliminatedDay = day;
    victim.eliminatedBy = attacker?.id;
    eliminatedIds.push(victim.id);
    if (attacker) {
      attacker.stats.eliminations += 1;
      actors.slice(1, -1).forEach((assistant) => {
        assistant.stats.assists += 1;
      });
    }
  } else {
    switch (definition.effect) {
      case "heal":
        actors.forEach((participant) => {
          participant.health = clamp(participant.health + rng.int(5, 14));
          participant.injuries = Math.max(0, participant.injuries - 1);
        });
        break;
      case "injure": {
        const injured = actors[actors.length - 1];
        injured.health = clamp(injured.health - rng.int(5, 16));
        injured.injuries += 1;
        break;
      }
      case "supplies":
        actors.slice(0, Math.max(1, actors.length - 1)).forEach((participant, index) => {
          participant.supplies += 1;
          const granted = grantItem(participant, rng, definition.itemPool ?? "survival");
          if (index === 0) {
            itemId = granted;
            itemRecipientId = participant.id;
          }
        });
        if (definition.id === "raid" && actors.length > 1) {
          actors[actors.length - 1].supplies = Math.max(0, actors[actors.length - 1].supplies - 1);
        }
        break;
      case "airdrop": {
        const recipient = actors[0];
        itemId = grantItem(recipient, rng, definition.itemPool ?? "any");
        itemRecipientId = recipient.id;
        break;
      }
      case "disarm": {
        const recipient = actors[0];
        const target = actors[actors.length - 1];
        const transferred = target.equippedWeapon ?? bestWeapon(target.inventory);
        if (transferred) {
          target.inventory = target.inventory.filter((candidate) => candidate !== transferred);
          target.equippedWeapon = bestWeapon(target.inventory);
          if (!recipient.inventory.includes(transferred)) recipient.inventory.push(transferred);
          recipient.equippedWeapon = bestWeapon(recipient.inventory);
          itemId = transferred;
          itemRecipientId = recipient.id;
        }
        break;
      }
      case "morale":
        actors.forEach((participant) => {
          participant.morale = clamp(participant.morale + (definition.category === "conflict" ? -8 : 8));
        });
        break;
      default:
        break;
    }
  }

  if (!itemId && definition.requiresWeapon) itemId = actors[0]?.equippedWeapon;
  const actorWeapons = Object.fromEntries(
    actors.map((participant) => [participant.id, participant.equippedWeapon ?? null]),
  ) as Record<string, ItemId | null>;

  return {
    id: `d${day}_e${eventIndex}`,
    definitionId: definition.id,
    category: definition.category,
    actorIds: actors.map((participant) => participant.id),
    eliminatedIds,
    day,
    itemId,
    itemRecipientId,
    actorWeapons,
  };
}

function eventCount(aliveCount: number, deathBudget: number): number {
  if (aliveCount <= 5) return Math.max(deathBudget, aliveCount + 1);
  return Math.max(deathBudget + 3, Math.min(16, Math.ceil(aliveCount * 0.45)));
}

export function simulateNextDay(source: GameState): GameState {
  if (source.status === "complete" || source.currentDay >= 8) return source;

  const game = structuredClone(source);
  const day = game.currentDay + 1;
  const rng = new SeededRandom(`${game.seed}:day:${day}`);
  const currentAlive = aliveParticipants(game).length;
  const target = Math.min(currentAlive, survivorTarget(game.initialCount, day));
  const deathBudget = Math.max(0, currentAlive - target);
  const totalEvents = eventCount(currentAlive, deathBudget);
  const airdropBudget = day < 8 && (day === 1 || rng.bool(0.46)) ? 1 : 0;
  const slots = rng.shuffle([
    ...Array.from({ length: deathBudget }, () => "fatal" as const),
    ...Array.from({ length: airdropBudget }, () => "airdrop" as const),
    ...Array.from({ length: Math.max(1, totalEvents - deathBudget - airdropBudget) }, () => "nonfatal" as const),
  ]);
  const touched = new Set<string>();
  const usedDefinitions = new Set<string>();
  const events: EventResult[] = [];

  for (const slot of slots) {
    const alive = aliveParticipants(game);
    if (alive.length === 0) break;
    if (slot === "fatal" && alive.length <= (day < 8 ? 2 : 1)) continue;

    const conflictChance = game.intensity === "soft" ? 0.58 : game.intensity === "intense" ? 0.8 : 0.7;
    const category =
      slot === "airdrop"
        ? "discovery"
        : slot === "fatal"
        ? rng.bool(conflictChance)
          ? "conflict"
          : "environment"
        : rng.bool(conflictChance)
          ? "conflict"
          : rng.bool(0.45)
            ? "alliance"
            : rng.bool(0.5)
              ? "environment"
              : "discovery";
    const wantsDarkHumor = slot !== "airdrop" && game.darkHumor && rng.bool(slot === "fatal" ? 0.42 : 0.34);
    const candidates = EVENT_DEFINITIONS.filter((definition) => {
      if (definition.fatal !== (slot === "fatal")) return false;
      if (slot === "airdrop" ? definition.effect !== "airdrop" : definition.effect === "airdrop") return false;
      if (definition.actorCount > alive.length) return false;
      if (definition.category !== category) return false;
      if (definition.requiresWeapon && !alive.some((participant) => participant.equippedWeapon)) return false;
      if (usedDefinitions.has(definition.id)) return false;
      return Boolean(definition.darkHumor) === wantsDarkHumor;
    });
    const pool = candidates.length
      ? candidates
      : EVENT_DEFINITIONS.filter(
          (definition) =>
            definition.fatal === (slot === "fatal") &&
            (slot === "airdrop" ? definition.effect === "airdrop" : definition.effect !== "airdrop") &&
            definition.actorCount <= alive.length &&
            (!definition.requiresWeapon || alive.some((participant) => participant.equippedWeapon)) &&
            (game.darkHumor || !definition.darkHumor) &&
            !usedDefinitions.has(definition.id),
        );
    const fallbackPool = pool.length
      ? pool
      : EVENT_DEFINITIONS.filter(
          (definition) =>
            definition.fatal === (slot === "fatal") &&
            (slot === "airdrop" ? definition.effect === "airdrop" : definition.effect !== "airdrop") &&
            definition.actorCount <= alive.length &&
            (!definition.requiresWeapon || alive.some((participant) => participant.equippedWeapon)) &&
            (game.darkHumor || !definition.darkHumor),
        );
    const priorDefinitionCounts = game.days
      .flatMap((result) => result.events)
      .reduce<Record<string, number>>((counts, event) => {
        counts[event.definitionId] = (counts[event.definitionId] ?? 0) + 1;
        return counts;
      }, {});
    const definition = rng.weighted(fallbackPool, (candidate) => 1 / (1 + (priorDefinitionCounts[candidate.id] ?? 0) * 3));
    const actors = chooseActors(game, definition, rng, touched);
    actors.forEach((participant) => touched.add(participant.id));
    usedDefinitions.add(definition.id);
    events.push(applyEvent(game, definition, actors, day, events.length, rng));
  }

  aliveParticipants(game).forEach((participant) => {
    participant.stats.daysSurvived = day;
    participant.morale = clamp(participant.morale - rng.int(1, 5));
    if (participant.supplies > 0 && participant.health < 80 && rng.bool(0.35)) {
      participant.supplies -= 1;
      participant.health = clamp(participant.health + rng.int(3, 8));
    }
  });

  const eliminatedIds = events.flatMap((event) => event.eliminatedIds);
  const dayResult: DayResult = {
    day,
    eventIds: events.map((event) => event.id),
    events,
    eliminatedIds,
    survivorsAfter: aliveParticipants(game).length,
  };
  game.days.push(dayResult);
  game.currentDay = day;
  game.status = day === 8 || aliveParticipants(game).length === 1 ? "complete" : "active";
  game.updatedAt = new Date().toISOString();
  return game;
}

export function getRanking(game: GameState): ParticipantState[] {
  return [...game.participants].sort((first, second) => {
    if (first.alive !== second.alive) return first.alive ? -1 : 1;
    if ((first.eliminatedDay ?? 99) !== (second.eliminatedDay ?? 99)) {
      return (second.eliminatedDay ?? 99) - (first.eliminatedDay ?? 99);
    }
    if (first.stats.eliminations !== second.stats.eliminations) {
      return second.stats.eliminations - first.stats.eliminations;
    }
    return second.health - first.health;
  });
}

export function relationshipBetween(game: GameState, first: string, second: string): number {
  return game.relationships[pairKey(first, second)] ?? 0;
}

export function validateGame(game: GameState): string[] {
  const errors: string[] = [];
  const participantIds = new Set(game.participants.map((participant) => participant.id));
  if (game.participants.length < 2 || game.participants.length > 50) errors.push("participant-count");
  if (participantIds.size !== game.participants.length) errors.push("duplicate-participant-id");
  if (game.currentDay !== game.days.length) errors.push("day-count");
  if (game.currentDay > 8) errors.push("too-many-days");

  const eliminated = new Set<string>();
  game.days.forEach((day, dayIndex) => {
    if (day.day !== dayIndex + 1) errors.push("day-order");
    day.events.forEach((event) => {
      if (new Set(event.actorIds).size !== event.actorIds.length) errors.push("duplicate-event-actor");
      if (event.actorIds.some((id) => !participantIds.has(id))) errors.push("unknown-event-actor");
      if (event.itemId && !isItemId(event.itemId)) errors.push("unknown-item");
      if (event.itemRecipientId && !participantIds.has(event.itemRecipientId)) errors.push("unknown-item-recipient");
      event.eliminatedIds.forEach((id) => {
        if (eliminated.has(id)) errors.push("participant-eliminated-twice");
        eliminated.add(id);
      });
    });
  });

  if (game.status === "complete" && game.participants.filter((participant) => participant.alive).length !== 1) {
    errors.push("invalid-winner-count");
  }
  game.participants.forEach((participant) => {
    if (participant.inventory.some((itemId) => !isItemId(itemId))) errors.push("unknown-inventory-item");
    if (
      participant.equippedWeapon &&
      (!isWeapon(participant.equippedWeapon) || !participant.inventory.includes(participant.equippedWeapon))
    ) {
      errors.push("invalid-equipped-weapon");
    }
  });
  return errors;
}
