import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  ChevronDown,
  Dices,
  Ghost,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "../components/Avatar";
import { translate } from "../i18n";
import { processAvatarImage } from "../lib/images";
import { createId, createSeed, hashNumber } from "../lib/random";
import type { GameState, Intensity, Locale } from "../types";
import { createGame } from "../engine/simulation";

export interface ParticipantDraft {
  id: string;
  name: string;
  avatarSeed: number;
  avatarVersion: number;
  imageBlob?: Blob;
}

interface SetupScreenProps {
  locale: Locale;
  initialNames?: string[];
  initialTitle?: string;
  initialIntensity?: Intensity;
  initialDarkHumor?: boolean;
  onBack: () => void;
  onStart: (game: GameState, drafts: ParticipantDraft[]) => Promise<void>;
}

function createDraft(name = ""): ParticipantDraft {
  const id = createId("draft");
  return {
    id,
    name,
    avatarSeed: hashNumber(`${id}:${name}:${Date.now()}`),
    avatarVersion: 0,
  };
}

export function SetupScreen({
  locale,
  initialNames,
  initialTitle,
  initialIntensity = "cinematic",
  initialDarkHumor = false,
  onBack,
  onStart,
}: SetupScreenProps) {
  const t = <K extends Parameters<typeof translate>[1]>(key: K) => translate(locale, key);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [bulkNames, setBulkNames] = useState("");
  const [drafts, setDrafts] = useState<ParticipantDraft[]>(() =>
    initialNames?.length ? initialNames.map(createDraft) : [createDraft(), createDraft()],
  );
  const [intensity, setIntensity] = useState<Intensity>(initialIntensity);
  const [darkHumor, setDarkHumor] = useState(initialDarkHumor);
  const [seed, setSeed] = useState(createSeed);
  const [permission, setPermission] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const hasImages = useMemo(() => drafts.some((draft) => draft.imageBlob), [drafts]);

  const updateDraft = (id: string, updater: (draft: ParticipantDraft) => ParticipantDraft) => {
    setDrafts((current) => current.map((draft) => (draft.id === id ? updater(draft) : draft)));
  };

  const moveDraft = (index: number, direction: -1 | 1) => {
    setDrafts((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };

  const applyBulkNames = () => {
    const names = bulkNames
      .split(/\r?\n|;/)
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (!names.length) return;
    setDrafts(names.map(createDraft));
    setBulkNames("");
    setError("");
  };

  const validate = (): string | undefined => {
    if (drafts.length < 2) return t("minimumError");
    if (drafts.length > 50) return t("maximumError");
    if (drafts.some((draft) => !draft.name.trim())) return t("emptyError");
    const normalized = drafts.map((draft) => draft.name.trim().toLocaleLowerCase());
    if (new Set(normalized).size !== normalized.length) return t("duplicateError");
    if (hasImages && !permission) return t("permissionRequired");
    return undefined;
  };

  const start = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStarting(true);
    setError("");
    try {
      const game = createGame(
        drafts.map((draft) => draft.name.trim()),
        title,
        seed.trim() || createSeed(),
        intensity,
        darkHumor,
      );
      game.participants.forEach((participant, index) => {
        participant.avatarSeed = drafts[index].avatarSeed;
        participant.avatarVersion = drafts[index].avatarVersion;
        participant.hasCustomAvatar = Boolean(drafts[index].imageBlob);
      });
      await onStart(game, drafts);
    } catch {
      setError(t("storageError"));
      setStarting(false);
    }
  };

  return (
    <section className="setup-page">
      <button type="button" className="back-button" onClick={onBack}><ArrowLeft /> {t("back")}</button>
      <div className="setup-heading">
        <p className="eyebrow">{t("setupEyebrow")} / 01</p>
        <h1>{t("setupTitle")}</h1>
        <p>{t("setupDescription")}</p>
      </div>

      <div className="setup-layout">
        <div className="setup-main">
          <label className="field">
            <span>{t("operationName")}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("operationPlaceholder")}
              maxLength={80}
            />
          </label>

          <div className="bulk-entry">
            <label className="field">
              <span>{t("roster")}</span>
              <textarea
                value={bulkNames}
                onChange={(event) => setBulkNames(event.target.value)}
                placeholder={t("namesPlaceholder")}
                rows={4}
              />
            </label>
            <button type="button" className="secondary-button" onClick={applyBulkNames}>
              <Users /> {t("applyNames")}
            </button>
          </div>

          <div className="roster-heading">
            <h2>{t("participants")}</h2>
            <span className={drafts.length > 50 ? "count-badge is-error" : "count-badge"}>{drafts.length} / 50</span>
          </div>

          <div className="roster-list">
            {drafts.map((draft, index) => (
              <article className="participant-editor" key={draft.id}>
                <div className="participant-index">{String(index + 1).padStart(2, "0")}</div>
                <Avatar
                  name={draft.name || `P${index + 1}`}
                  seed={draft.avatarSeed}
                  version={draft.avatarVersion}
                  imageBlob={draft.imageBlob}
                  size="medium"
                />
                <div className="participant-editor__body">
                  <label>
                    <span className="sr-only">{t("participantName")}</span>
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft(draft.id, (current) => ({ ...current, name: event.target.value }))}
                      placeholder={`${t("participantName")} ${index + 1}`}
                      maxLength={50}
                    />
                  </label>
                  <div className="participant-tools">
                    <button
                      type="button"
                      onClick={() => updateDraft(draft.id, (current) => ({ ...current, avatarVersion: current.avatarVersion + 1, imageBlob: undefined }))}
                    >
                      <RefreshCw /> {t("reroll")}
                    </button>
                    <label>
                      <Camera /> {t("uploadPhoto")}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={async (event) => {
                          const file = event.currentTarget.files?.[0];
                          if (!file) return;
                          try {
                            const imageBlob = await processAvatarImage(file);
                            updateDraft(draft.id, (current) => ({ ...current, imageBlob }));
                            setError("");
                          } catch {
                            setError(t("imageError"));
                          }
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="reorder-tools">
                  <button type="button" onClick={() => moveDraft(index, -1)} disabled={index === 0} aria-label={t("moveUp")}><ArrowUp /></button>
                  <button type="button" onClick={() => moveDraft(index, 1)} disabled={index === drafts.length - 1} aria-label={t("moveDown")}><ArrowDown /></button>
                  <button
                    type="button"
                    className="danger-tool"
                    onClick={() => setDrafts((current) => current.filter((candidate) => candidate.id !== draft.id))}
                    aria-label={t("remove")}
                  >
                    <Trash2 />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="add-row-button"
            disabled={drafts.length >= 50}
            onClick={() => setDrafts((current) => [...current, createDraft()])}
          >
            <Plus /> {t("addParticipant")}
          </button>
        </div>

        <aside className="setup-sidebar">
          <details className="advanced-panel">
            <summary><Dices /> {t("advanced")} <ChevronDown /></summary>
            <div className="advanced-panel__content">
              <fieldset>
                <legend>{t("intensity")}</legend>
                {(["soft", "cinematic", "intense"] as Intensity[]).map((value) => (
                  <label className="radio-card" key={value}>
                    <input
                      type="radio"
                      name="intensity"
                      value={value}
                      checked={intensity === value}
                      onChange={() => setIntensity(value)}
                    />
                    <span>{t(value === "soft" ? "intensitySoft" : value === "intense" ? "intensityIntense" : "intensityCinematic")}</span>
                  </label>
                ))}
              </fieldset>
              <label className="toggle-setting">
                <input
                  type="checkbox"
                  checked={darkHumor}
                  onChange={(event) => setDarkHumor(event.target.checked)}
                />
                <span className="toggle-setting__control" aria-hidden="true"><i /></span>
                <span className="toggle-setting__copy">
                  <strong><Ghost /> {t("darkHumorLabel")}</strong>
                  <small>{t("darkHumorDescription")}</small>
                </span>
              </label>
              <label className="field">
                <span>{t("seed")}</span>
                <div className="input-action">
                  <input value={seed} onChange={(event) => setSeed(event.target.value)} maxLength={80} />
                  <button type="button" onClick={() => setSeed(createSeed())} aria-label={t("randomSeed")}><RefreshCw /></button>
                </div>
              </label>
            </div>
          </details>

          {hasImages && (
            <label className="permission-check">
              <input type="checkbox" checked={permission} onChange={(event) => setPermission(event.target.checked)} />
              <span><ShieldCheck /> {t("photoPermission")}</span>
            </label>
          )}

          <div className="launch-card">
            <span className="launch-card__count">{String(drafts.length).padStart(2, "0")}</span>
            <p>{t("participants")}</p>
            <progress className="launch-track" max={50} value={Math.min(50, drafts.length)}>
              {drafts.length} / 50
            </progress>
            {error && <div className="error-message" role="alert">{error}</div>}
            <button type="button" className="primary-button primary-button--large" onClick={start} disabled={starting}>
              {starting ? <span className="spinner" /> : <ArrowRight />} {t("start")}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
