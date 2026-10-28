import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { GameState, LocalGameArchive } from "../types";
import { loadAvatars, normalizeGame, saveAvatar, saveGame } from "./storage";
import { validateGame } from "../engine/simulation";

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024;
const MAX_ENTRY_SIZE = 2 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 51; // game.json and at most 50 participant avatars.

export function unpackGameArchive(data: Uint8Array): Record<string, Uint8Array> {
  if (data.byteLength > MAX_ARCHIVE_SIZE) throw new Error("invalid-archive");
  let totalSize = 0;
  const names = new Set<string>();
  try {
    return unzipSync(data, {
      // fflate runs this before allocating the decompressed entry.
      filter: ({ name, size, originalSize }) => {
        if (
          names.has(name) ||
          names.size >= MAX_ARCHIVE_ENTRIES ||
          (name !== "game.json" && !/^avatars\/[^/]+\.webp$/.test(name)) ||
          originalSize > MAX_ENTRY_SIZE ||
          size > MAX_ENTRY_SIZE + 1024
        ) throw new Error("invalid-archive");
        names.add(name);
        totalSize += originalSize;
        if (totalSize > MAX_ARCHIVE_SIZE) throw new Error("invalid-archive");
        return true;
      },
    });
  } catch {
    throw new Error("invalid-archive");
  }
}

export async function exportGameArchive(game: GameState): Promise<Blob> {
  const archive: LocalGameArchive = {
    archiveVersion: 1,
    exportedAt: new Date().toISOString(),
    game,
  };
  const files: Record<string, Uint8Array> = {
    "game.json": strToU8(JSON.stringify(archive)),
  };
  const avatars = await loadAvatars(game);
  for (const [participantId, blob] of avatars) {
    files[`avatars/${participantId}.webp`] = new Uint8Array(await blob.arrayBuffer());
  }
  return new Blob([zipSync(files, { level: 6 }) as BlobPart], { type: "application/zip" });
}

export async function importGameArchive(file: File): Promise<GameState> {
  if (file.size > MAX_ARCHIVE_SIZE) throw new Error("invalid-archive");
  let files: Record<string, Uint8Array>;
  try {
    files = unpackGameArchive(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error("invalid-archive");
  }
  const rawGame = files["game.json"];
  if (!rawGame || rawGame.byteLength > 2 * 1024 * 1024) throw new Error("invalid-archive");

  let archive: LocalGameArchive;
  try {
    archive = JSON.parse(strFromU8(rawGame)) as LocalGameArchive;
  } catch {
    throw new Error("invalid-archive");
  }
  if (archive.archiveVersion !== 1 || archive.game?.schemaVersion !== 1 || validateGame(archive.game).length) {
    throw new Error("invalid-archive");
  }

  const game: GameState = normalizeGame(structuredClone(archive.game));
  const knownParticipants = new Set(game.participants.map((participant) => participant.id));
  for (const [path, bytes] of Object.entries(files)) {
    if (!path.startsWith("avatars/")) continue;
    if (bytes.byteLength > 2 * 1024 * 1024) throw new Error("invalid-archive");
    const match = /^avatars\/([^/]+)\.webp$/.exec(path);
    if (!match || !knownParticipants.has(match[1])) throw new Error("invalid-archive");
    const participant = game.participants.find((candidate) => candidate.id === match[1]);
    if (participant?.hasCustomAvatar) {
      await saveAvatar(game.id, participant.id, new Blob([bytes as BlobPart], { type: "image/webp" }));
    }
  }
  game.updatedAt = new Date().toISOString();
  await saveGame(game);
  return game;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function safeFilename(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "zona-zero"
  );
}
