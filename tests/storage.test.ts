import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createGame } from "../src/engine/simulation";
import { deleteGame, listGames, loadGame, saveAvatar, saveGame } from "../src/lib/storage";

async function clearDatabase(): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("zona-zero");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

afterEach(clearDatabase);

describe("local game storage", () => {
  it("saves, lists, loads and deletes a game", async () => {
    const game = createGame(["Maria", "Jorge", "Jaume", "Blanca"], "Operació test", "storage-seed", "cinematic");
    await saveGame(game);

    const summaries = await listGames();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: game.id,
      title: "Operació test",
      initialCount: 4,
      survivors: 4,
    });
    expect(await loadGame(game.id)).toEqual(game);

    await deleteGame(game.id);
    expect(await listGames()).toEqual([]);
  });

  it("removes participant images together with the game", async () => {
    const game = createGame(["Maria", "Jorge"], "Imatges", "avatar-seed", "soft");
    game.participants[0].hasCustomAvatar = true;
    await saveGame(game);
    await saveAvatar(game.id, game.participants[0].id, new Blob(["image"], { type: "image/webp" }));
    await deleteGame(game.id);
    expect(await loadGame(game.id)).toBeUndefined();
  });

  it("normalizes loadouts from games saved before equipment existed", async () => {
    const game = createGame(["Maria", "Jorge"], "Antiga", "legacy-seed", "soft");
    const legacy = structuredClone(game) as Omit<typeof game, "darkHumor" | "revealedEvents"> & {
      darkHumor?: boolean;
      revealedEvents?: Record<number, number>;
    };
    delete legacy.darkHumor;
    delete legacy.revealedEvents;
    legacy.participants[0].inventory = ["compact_bow"];
    delete legacy.participants[0].equippedWeapon;
    await saveGame(legacy as typeof game);

    const loaded = await loadGame(game.id);
    expect(loaded?.darkHumor).toBe(false);
    expect(loaded?.revealedEvents).toEqual({});
    expect(loaded?.participants[0].equippedWeapon).toBe("compact_bow");
  });
});
