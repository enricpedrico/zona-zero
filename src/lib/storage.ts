import type { GameState, GameSummary } from "../types";
import { normalizeLoadout } from "../engine/items";
import { isOutcomeRevealed, visibleParticipants } from "../engine/presentation";

const DB_NAME = "zona-zero";
const DB_VERSION = 1;
const GAME_STORE = "games";
const AVATAR_STORE = "avatars";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(GAME_STORE)) {
        database.createObjectStore(GAME_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(AVATAR_STORE)) {
        database.createObjectStore(AVATAR_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage"));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local storage operation failed"));
  });
}

export function normalizeGame(game: GameState): GameState {
  const legacyRevealedEvents =
    game.revealedEvents ??
    (game.currentDay > 0
      ? { [game.currentDay]: game.days[game.currentDay - 1]?.events.length ?? 0 }
      : {});
  return {
    ...game,
    darkHumor: game.darkHumor ?? false,
    revealedEvents: legacyRevealedEvents,
    participants: game.participants.map(normalizeLoadout),
  };
}

export async function saveGame(game: GameState): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(GAME_STORE, "readwrite");
  transaction.objectStore(GAME_STORE).put(game);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the game"));
  });
  database.close();
}

export async function loadGame(id: string): Promise<GameState | undefined> {
  const database = await openDatabase();
  const result = await requestResult(database.transaction(GAME_STORE).objectStore(GAME_STORE).get(id));
  database.close();
  return result ? normalizeGame(result as GameState) : undefined;
}

export async function listGames(): Promise<GameSummary[]> {
  const database = await openDatabase();
  const games = ((await requestResult(
    database.transaction(GAME_STORE).objectStore(GAME_STORE).getAll(),
  )) as GameState[]).map(normalizeGame);
  database.close();
  return games
    .map((game) => {
      const outcomeRevealed = isOutcomeRevealed(game);
      return {
        id: game.id,
        title: game.title,
        status: outcomeRevealed ? ("complete" as const) : ("active" as const),
        currentDay: game.currentDay,
        initialCount: game.initialCount,
        survivors: visibleParticipants(game).length,
        updatedAt: game.updatedAt,
        winnerName: outcomeRevealed ? game.participants.find((participant) => participant.alive)?.name : undefined,
      };
    })
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export async function deleteGame(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([GAME_STORE, AVATAR_STORE], "readwrite");
  transaction.objectStore(GAME_STORE).delete(id);
  const avatarStore = transaction.objectStore(AVATAR_STORE);
  const keys = (await requestResult(avatarStore.getAllKeys())) as IDBValidKey[];
  keys
    .filter((key) => typeof key === "string" && key.startsWith(`${id}:`))
    .forEach((key) => avatarStore.delete(key));
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete the game"));
  });
  database.close();
}

export async function saveAvatar(gameId: string, participantId: string, blob: Blob): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(AVATAR_STORE, "readwrite");
  transaction.objectStore(AVATAR_STORE).put(blob, `${gameId}:${participantId}`);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the image"));
  });
  database.close();
}

export async function loadAvatar(gameId: string, participantId: string): Promise<Blob | undefined> {
  const database = await openDatabase();
  const blob = await requestResult(
    database.transaction(AVATAR_STORE).objectStore(AVATAR_STORE).get(`${gameId}:${participantId}`),
  );
  database.close();
  return blob as Blob | undefined;
}

export async function loadAvatars(game: GameState): Promise<Map<string, Blob>> {
  const entries = await Promise.all(
    game.participants.map(async (participant) => {
      const blob = participant.hasCustomAvatar ? await loadAvatar(game.id, participant.id) : undefined;
      return [participant.id, blob] as const;
    }),
  );
  return new Map(entries.filter((entry): entry is readonly [string, Blob] => Boolean(entry[1])));
}
