import { AlertTriangle, Check, DownloadCloud, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "./components/Modal";
import { Shell } from "./components/Shell";
import { isOutcomeRevealed } from "./engine/presentation";
import { createGame, simulateNextDay } from "./engine/simulation";
import { localeMeta, translate } from "./i18n";
import { exportGameArchive, importGameArchive, downloadBlob, safeFilename } from "./lib/archive";
import { createSeed } from "./lib/random";
import {
  deleteGame,
  listGames,
  loadAvatars,
  loadGame,
  saveAvatar,
  saveGame,
} from "./lib/storage";
import { GameScreen } from "./screens/GameScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { SetupScreen, type ParticipantDraft } from "./screens/SetupScreen";
import type { GameState, GameSummary, Locale } from "./types";

type View = "home" | "setup" | "game" | "results";

function getInitialLocale(): Locale {
  const stored = localStorage.getItem("zona-zero-locale");
  return stored === "ca" || stored === "es" || stored === "en" ? stored : "ca";
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const [view, setView] = useState<View>("home");
  const [games, setGames] = useState<GameSummary[]>([]);
  const [game, setGame] = useState<GameState>();
  const [avatars, setAvatars] = useState<Map<string, Blob>>(new Map());
  const [legalOpen, setLegalOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingNew, setPendingNew] = useState(false);
  const [toast, setToast] = useState("");
  const [updateReady, setUpdateReady] = useState<ServiceWorkerRegistration>();
  const [replayData, setReplayData] = useState<{
    names: string[];
    title: string;
    intensity: GameState["intensity"];
    darkHumor: boolean;
  }>();

  const t = useCallback(
    <K extends Parameters<typeof translate>[1]>(key: K) => translate(locale, key),
    [locale],
  );

  const refreshGames = useCallback(async () => {
    try {
      setGames(await listGames());
    } catch {
      setGames([]);
    }
  }, []);

  useEffect(() => {
    refreshGames();
  }, [refreshGames]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("main-content")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  useEffect(() => {
    localStorage.setItem("zona-zero-locale", locale);
    document.documentElement.lang = localeMeta[locale].htmlLang;
  }, [locale]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting) setUpdateReady(registration);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(registration);
        });
      });
    });
  }, []);

  const goHome = async () => {
    setView("home");
    setGame(undefined);
    setAvatars(new Map());
    setReplayData(undefined);
    await refreshGames();
    window.scrollTo({ top: 0 });
  };

  const requestNew = () => {
    if (localStorage.getItem("zona-zero-content-accepted") === "yes") {
      setReplayData(undefined);
      setView("setup");
    } else {
      setPendingNew(true);
      setWarningOpen(true);
    }
  };

  const acceptWarning = () => {
    localStorage.setItem("zona-zero-content-accepted", "yes");
    setWarningOpen(false);
    if (pendingNew) {
      setPendingNew(false);
      setReplayData(undefined);
      setView("setup");
    }
  };

  const startGame = async (nextGame: GameState, drafts: ParticipantDraft[]) => {
    await Promise.all(
      drafts.map((draft, index) => {
        const participant = nextGame.participants[index];
        return draft.imageBlob ? saveAvatar(nextGame.id, participant.id, draft.imageBlob) : Promise.resolve();
      }),
    );
    await saveGame(nextGame);
    setGame(nextGame);
    setAvatars(await loadAvatars(nextGame));
    setView("game");
    await refreshGames();
    window.scrollTo({ top: 0 });
  };

  const resumeGame = async (id: string) => {
    const loaded = await loadGame(id);
    if (!loaded) return;
    setGame(loaded);
    setAvatars(await loadAvatars(loaded));
    setView(isOutcomeRevealed(loaded) ? "results" : "game");
    window.scrollTo({ top: 0 });
  };

  const advanceGame = async (): Promise<GameState> => {
    if (!game) throw new Error("No active game");
    const next = simulateNextDay(game);
    try {
      await saveGame(next);
      await refreshGames();
    } catch {
      setToast(t("storageError"));
    }
    setGame(next);
    return next;
  };

  const revealEvent = async (day: number, count: number) => {
    if (!game) return;
    const next: GameState = {
      ...game,
      revealedEvents: { ...game.revealedEvents, [day]: count },
      updatedAt: new Date().toISOString(),
    };
    setGame(next);
    try {
      await saveGame(next);
    } catch {
      setToast(t("storageError"));
    }
  };

  const exportById = async (id: string) => {
    const target = game?.id === id ? game : await loadGame(id);
    if (!target) return;
    const blob = await exportGameArchive(target);
    downloadBlob(blob, `${safeFilename(target.title)}.zonazero`);
  };

  const duplicateById = async (id: string) => {
    const source = await loadGame(id);
    if (!source) return;
    const copy = createGame(
      source.participants.map((participant) => participant.name),
      `${source.title} / COPY`,
      createSeed(),
      source.intensity,
      source.darkHumor ?? false,
    );
    const sourceImages = await loadAvatars(source);
    await Promise.all(
      copy.participants.map(async (participant, index) => {
        const original = source.participants[index];
        participant.avatarSeed = original.avatarSeed;
        participant.avatarVersion = original.avatarVersion;
        const blob = sourceImages.get(original.id);
        participant.hasCustomAvatar = Boolean(blob);
        if (blob) await saveAvatar(copy.id, participant.id, blob);
      }),
    );
    await saveGame(copy);
    await refreshGames();
  };

  const importArchive = async (file: File) => {
    try {
      const imported = await importGameArchive(file);
      setToast(t("imported"));
      await refreshGames();
      await resumeGame(imported.id);
    } catch {
      setToast(t("importError"));
    }
  };

  const replay = () => {
    if (!game) return;
    setReplayData({
      names: game.participants.map((participant) => participant.name),
      title: game.title,
      intensity: game.intensity,
      darkHumor: game.darkHumor ?? false,
    });
    setView("setup");
    window.scrollTo({ top: 0 });
  };

  return (
    <Shell
      locale={locale}
      onLocaleChange={setLocale}
      onHome={goHome}
      onLegal={() => setLegalOpen(true)}
      legalLabel={t("legal")}
      compact={view === "game"}
    >
      {view === "home" && (
        <HomeScreen
          locale={locale}
          games={games}
          onNew={requestNew}
          onResume={resumeGame}
          onDelete={async (id) => {
            await deleteGame(id);
            await refreshGames();
          }}
          onDuplicate={duplicateById}
          onExport={exportById}
          onImport={importArchive}
        />
      )}
      {view === "setup" && (
        <SetupScreen
          locale={locale}
          initialNames={replayData?.names}
          initialTitle={replayData?.title}
          initialIntensity={replayData?.intensity}
          initialDarkHumor={replayData?.darkHumor}
          onBack={goHome}
          onStart={startGame}
        />
      )}
      {view === "game" && game && (
        <GameScreen
          locale={locale}
          game={game}
          avatars={avatars}
          onAdvance={advanceGame}
          onReveal={revealEvent}
          onFinish={() => {
            setView("results");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
      {view === "results" && game && (
        <ResultsScreen
          locale={locale}
          game={game}
          avatars={avatars}
          onReplay={replay}
          onHome={goHome}
          onExportArchive={() => exportById(game.id)}
          onToast={setToast}
        />
      )}

      {legalOpen && (
        <Modal title={t("legal")} eyebrow="LEGAL / LOCAL" closeLabel={t("close")} onClose={() => setLegalOpen(false)}>
          <div className="legal-grid">
            <article><ShieldCheck /><h3>{t("privacyTitle")}</h3><p>{t("privacyText")}</p></article>
            <article><DownloadCloud /><h3>{t("storageTitle")}</h3><p>{t("storageText")}</p></article>
            <article><AlertTriangle /><h3>{t("useTitle")}</h3><p>{t("useText")}</p></article>
          </div>
          <p className="legal-disclaimer">{t("disclaimer")}</p>
        </Modal>
      )}

      {warningOpen && (
        <Modal
          title={t("warningTitle")}
          eyebrow="CONTENT / NOTICE"
          closeLabel={t("close")}
          onClose={() => {
            setWarningOpen(false);
            setPendingNew(false);
          }}
          narrow
        >
          <div className="warning-body">
            <AlertTriangle />
            <p>{t("warningText")}</p>
            <button type="button" className="primary-button" onClick={acceptWarning}><Check /> {t("understand")}</button>
          </div>
        </Modal>
      )}

      {toast && <div className="toast" role="status"><Check /> {toast}</div>}
      {updateReady && (
        <div className="update-toast" role="status">
          <span>{t("updateAvailable")}</span>
          <button
            type="button"
            onClick={() => {
              updateReady.waiting?.postMessage({ type: "SKIP_WAITING" });
              window.location.reload();
            }}
          >
            {t("updateNow")}
          </button>
        </div>
      )}
    </Shell>
  );
}
