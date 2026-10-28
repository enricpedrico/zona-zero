import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { unpackGameArchive } from "../src/lib/archive";

describe("untrusted game archives", () => {
  it("retains valid game data and avatars", () => {
    const game = strToU8('{"archiveVersion":1}');
    const image = new Uint8Array([1, 2, 3]);
    const result = unpackGameArchive(zipSync({ "game.json": game, "avatars/player.webp": image }));
    expect(Array.from(result["game.json"])).toEqual(Array.from(game));
    expect(Array.from(result["avatars/player.webp"])).toEqual(Array.from(image));
  });

  it("rejects highly compressed entries before expansion", () => {
    for (const name of ["game.json", "avatars/player.webp"]) {
      const bomb = zipSync({ [name]: new Uint8Array(2 * 1024 * 1024 + 1) }, { level: 9 });
      expect(bomb.byteLength).toBeLessThan(5000);
      expect(() => unpackGameArchive(bomb)).toThrow("invalid-archive");
    }
  });

  it("rejects unexpected files and excess entries", () => {
    for (const name of ["other.json", "../game.json", "avatars/../../game.json", "avatars/x/evil.webp"]) {
      expect(() => unpackGameArchive(zipSync({ [name]: new Uint8Array(1) }))).toThrow("invalid-archive");
    }
    const files: Record<string, Uint8Array> = { "game.json": strToU8("{}") };
    for (let index = 0; index < 51; index++) files[`avatars/${index}.webp`] = new Uint8Array(1);
    expect(() => unpackGameArchive(zipSync(files))).toThrow("invalid-archive");
  });

  it("rejects non-ZIP input", () => {
    expect(() => unpackGameArchive(strToU8("not a zip"))).toThrow("invalid-archive");
  });
});
